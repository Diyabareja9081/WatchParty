function getParticipant(room, socketId) {
  if (!room) return null;

  return room.getParticipant(socketId);
}

function canControlPlayback(room, socketId) {
  const participant =
    getParticipant(room, socketId);

  if (!participant) return false;

  return (
    participant.role === "Host" ||
    participant.role === "Moderator"
  );
}

function canManageRoom(room, socketId) {
  const participant =
    getParticipant(room, socketId);

  return (
    participant &&
    participant.role === "Host"
  );
}

function getCurrentTime(room) {
  if (!room) return 0;

  return room.getCurrentTime();
}

function getParticipantsArray(room) {
  if (!room) return [];

  return room.getParticipants().map(
    (participant) => ({
      userId: participant.userId,
      username: participant.username,
      role: participant.role,
    })
  );
}

function broadcastParticipants(io, room) {
  if (!room) return;

  io.to(room.roomId).emit(
    "participants_updated",
    {
      participants:
        getParticipantsArray(room),
    }
  );
}

function broadcastPlaybackState(io, room) {
  if (!room) return;

  const currentTime =
    getCurrentTime(room);

  io.to(room.roomId).emit(
    "sync_state",
    {
      playState:
        room.playback.playState,

      currentTime,

      videoId:
        room.playback.videoId,

      serverTime: Date.now(),
    }
  );
}

module.exports = {
  getParticipant,
  canControlPlayback,
  canManageRoom,
  getCurrentTime,
  getParticipantsArray,
  broadcastParticipants,
  broadcastPlaybackState,
};