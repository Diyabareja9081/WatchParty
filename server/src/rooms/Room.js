class Room {
  constructor(roomId, videoId, persisted = {}) {
    this.roomId = roomId;

    this.participants = new Map();

    this.hostUserId = persisted.hostUserId || null;
    this.createdAt = persisted.createdAt || Date.now();
    this.playback = {
      videoId: persisted.videoId || videoId,
      playState: persisted.playState || "paused",
      currentTime: Number(persisted.currentTime || 0),
      lastUpdated: persisted.lastUpdated || Date.now(),
    };
    this.requests = new Map();
    this.messages = [];
  }

  addParticipant(participant) {
    this.participants.set(
      participant.userId,
      participant
    );
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
  }

  getParticipant(userId) {
    return (
      this.participants.get(userId) ||
      null
    );
  }

  getParticipants() {
    return Array.from(
      this.participants.values()
    );
  }

  getCurrentTime() {
    let currentTime =
      this.playback.currentTime;

    if (
      this.playback.playState ===
      "playing"
    ) {
      const elapsed =
        (Date.now() -
          this.playback.lastUpdated) /
        1000;

      currentTime += elapsed;
    }

    return Math.max(
      0,
      currentTime
    );
  }

  setHost(userId) { this.hostUserId = userId; }

  addMessage(message) { this.messages.push(message); if (this.messages.length > 100) this.messages.shift(); }

  updatePlayback(
    playState,
    currentTime,
    videoId
  ) {
    this.playback.playState =
      playState;

    this.playback.currentTime =
      currentTime;

    this.playback.videoId =
      videoId;

    this.playback.lastUpdated =
      Date.now();
  }
}

module.exports = Room;