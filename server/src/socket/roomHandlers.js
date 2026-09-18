const rooms = require('../rooms/roomStore');
const Participant = require('../models/Participant');
const Room = require('../rooms/Room');
const { getCurrentTime, getParticipantsArray, broadcastParticipants } = require('../rooms/roomHelpers');
const { generateRoomId } = require('../utils/ids');
const { DEFAULT_VIDEO_ID, MAX_USERNAME_LENGTH } = require('../config/constants');
function cleanUsername(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_USERNAME_LENGTH) : ''; }
function playback(room) { return { playState: room.playback.playState, currentTime: getCurrentTime(room), videoId: room.playback.videoId, serverTime: Date.now() }; }
function registerRoomHandlers(io, socket) {
  socket.on('create_room', ({ username } = {}) => {
    const user = socket.data.user; const name = cleanUsername(username || user?.username);
    if (!user || !name) return socket.emit('error_message', { message: 'Please log in first.' });
    const roomId = generateRoomId(); const room = new Room(roomId, DEFAULT_VIDEO_ID, { hostUserId: user.id }); room.setHost(user.id);
    const participant = new Participant(socket.id, name, 'Host'); participant.userAccountId = user.id; room.addParticipant(participant); rooms.set(roomId, room); rooms.saveRoom(room); rooms.saveMember(roomId, user.id, 'Host');
    socket.join(roomId); socket.data.roomId = roomId;
    socket.emit('room_created', { roomId, userId: socket.id, role: 'Host', username: name, participants: getParticipantsArray(room), playback: playback(room) });
  });
  socket.on('join_room', ({ roomId, username } = {}) => {
    const user = socket.data.user; const normalized = typeof roomId === 'string' ? roomId.trim().toUpperCase() : ''; const name = cleanUsername(username || user?.username);
    if (!user || !normalized || !name) return socket.emit('error_message', { message: 'Login, room code and username are required.' });
    const room = rooms.loadRoom(normalized); if (!room) return socket.emit('error_message', { message: 'Room not found. Check the room code.' });
    if (room.participants.size >= 50) return socket.emit('error_message', { message: 'This room is full.' });
    // If this is the Host reconnecting after a dropped connection (common
    // on mobile), cancel the grace-period timer so the room doesn't get
    // closed out from under them.
    if (user.id === room.hostUserId && room.hostDisconnectTimer) { clearTimeout(room.hostDisconnectTimer); room.hostDisconnectTimer = null; }
    const existingRole = room.persistedRoles?.get(user.id); const role = user.id === room.hostUserId ? 'Host' : (existingRole || 'Participant');
    const participant = new Participant(socket.id, name, role); participant.userAccountId = user.id; room.addParticipant(participant); rooms.saveMember(normalized, user.id, role);
    socket.join(normalized); socket.data.roomId = normalized;
    socket.emit('room_joined', { roomId: normalized, userId: socket.id, username: name, role, participants: getParticipantsArray(room), playback: playback(room), messages: room.messages });
    socket.to(normalized).emit('user_joined', { username: name, userId: participant.userId, role, participants: getParticipantsArray(room) }); broadcastParticipants(io, room);
  });
  socket.on('request_sync', () => { const room = rooms.get(socket.data.roomId); if (!room || !room.getParticipant(socket.id)) return; socket.emit('sync_state', playback(room)); });
}
module.exports = { registerRoomHandlers };
