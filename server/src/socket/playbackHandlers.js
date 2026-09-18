const rooms = require('../rooms/roomStore');
const {
  canControlPlayback,
  getCurrentTime,
  broadcastPlaybackState,
} = require('../rooms/roomHelpers');
const { YOUTUBE_VIDEO_ID } = require('../config/constants');
const roomsStore = require('../rooms/roomStore');

function requireController(socket, room, action) {
  if (!canControlPlayback(room, socket.id)) {
    socket.emit('permission_denied', {
      action,
      message: 'Only the Host or Moderator can control playback.',
    });
    return false;
  }
  return true;
}

function registerPlaybackHandlers(io, socket) {
  socket.on('play', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !requireController(socket, room, 'play')) return;

    room.updatePlayback('playing', getCurrentTime(room), room.playback.videoId);
    roomsStore.saveRoom(room);
    broadcastPlaybackState(io, room);
  });

  socket.on('pause', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !requireController(socket, room, 'pause')) return;

    room.updatePlayback('paused', getCurrentTime(room), room.playback.videoId);
    roomsStore.saveRoom(room);
    broadcastPlaybackState(io, room);
  });

  socket.on('seek', ({ time } = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !requireController(socket, room, 'seek')) return;

    const nextTime = Number(time);
    if (!Number.isFinite(nextTime) || nextTime < 0 || nextTime > 24 * 60 * 60) {
      socket.emit('error_message', { message: 'Invalid seek position.' });
      return;
    }

    room.updatePlayback(room.playback.playState, nextTime, room.playback.videoId);
    roomsStore.saveRoom(room);
    broadcastPlaybackState(io, room);
  });

  socket.on('change_video', ({ videoId } = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !requireController(socket, room, 'change_video')) return;

    if (typeof videoId !== 'string' || !YOUTUBE_VIDEO_ID.test(videoId)) {
      socket.emit('error_message', { message: 'Invalid YouTube video ID.' });
      return;
    }

    room.updatePlayback('paused', 0, videoId);
    roomsStore.saveRoom(room);
    broadcastPlaybackState(io, room);
  });
}

module.exports = { registerPlaybackHandlers };
