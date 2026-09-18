const rooms = require("../rooms/roomStore");

function generateRoomId() {
  let roomId;

  do {
    roomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms.has(roomId));

  return roomId;
}

function generateRequestId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}

module.exports = {
  generateRoomId,
  generateRequestId,
};