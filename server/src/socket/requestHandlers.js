const rooms = require('../rooms/roomStore');
const {
  canControlPlayback,
  getParticipant,
  getCurrentTime,
  broadcastPlaybackState,
} = require('../rooms/roomHelpers');
const { generateRequestId } = require('../utils/ids');
const { YOUTUBE_VIDEO_ID } = require('../config/constants');

const ALLOWED_ACTIONS = new Set(['play', 'pause', 'seek', 'change_video']);

function executeRequestedAction(io, room, request) {
  switch (request.action) {
    case 'play':
      room.updatePlayback('playing', getCurrentTime(room), room.playback.videoId);
      break;
    case 'pause':
      room.updatePlayback('paused', getCurrentTime(room), room.playback.videoId);
      break;
    case 'seek':
      room.updatePlayback(room.playback.playState, request.time, room.playback.videoId);
      break;
    case 'change_video':
      room.updatePlayback('paused', 0, request.videoId);
      break;
    default:
      return false;
  }

  rooms.saveRoom(room);
  broadcastPlaybackState(io, room);
  return true;
}

function registerRequestHandlers(io, socket) {
  socket.on('request_action', (payload = {}) => {
    const room = rooms.get(socket.data.roomId);
    const participant = room && getParticipant(room, socket.id);
    if (!room || !participant) return;

    // Controllers act directly; only Participants use the approval workflow.
    if (canControlPlayback(room, socket.id)) {
      socket.emit('error_message', {
        message: 'You can control playback directly; no request is needed.',
      });
      return;
    }

    const { action } = payload;
    if (!ALLOWED_ACTIONS.has(action)) {
      socket.emit('error_message', { message: 'Invalid playback request.' });
      return;
    }

    const request = {
      requestId: generateRequestId(),
      userId: socket.id,
      username: participant.username,
      action,
      createdAt: Date.now(),
    };

    if (action === 'seek') {
      const time = Number(payload.time);
      if (!Number.isFinite(time) || time < 0 || time > 24 * 60 * 60) {
        socket.emit('error_message', { message: 'Invalid seek position.' });
        return;
      }
      request.time = time;
    }

    if (action === 'change_video') {
      if (typeof payload.videoId !== 'string' || !YOUTUBE_VIDEO_ID.test(payload.videoId)) {
        socket.emit('error_message', { message: 'Invalid YouTube video.' });
        return;
      }
      request.videoId = payload.videoId;
    }

    room.requests.set(request.requestId, request);

    for (const [participantId, member] of room.participants) {
      if (member.role === 'Host' || member.role === 'Moderator') {
        io.to(participantId).emit('control_request', request);
      }
    }

    socket.emit('request_submitted', {
      requestId: request.requestId,
      message: 'Your request was sent to the Host/Moderator.',
    });
  });

  socket.on('approve_request', ({ requestId } = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    if (!canControlPlayback(room, socket.id)) {
      socket.emit('permission_denied', {
        action: 'approve_request',
        message: 'Only the Host or Moderator can approve requests.',
      });
      return;
    }

    const request = room.requests.get(requestId);
    if (!request) {
      socket.emit('error_message', { message: 'Request no longer exists.' });
      return;
    }

    executeRequestedAction(io, room, request);
    room.requests.delete(requestId);
    io.to(room.roomId).emit('request_resolved', { requestId, status: 'approved' });
  });

  socket.on('reject_request', ({ requestId } = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    if (!canControlPlayback(room, socket.id)) {
      socket.emit('permission_denied', {
        action: 'reject_request',
        message: 'Only the Host or Moderator can reject requests.',
      });
      return;
    }

    if (!room.requests.has(requestId)) return;
    room.requests.delete(requestId);
    io.to(room.roomId).emit('request_resolved', { requestId, status: 'rejected' });
  });
}

module.exports = { registerRequestHandlers };
