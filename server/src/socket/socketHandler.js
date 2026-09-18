const {
  registerRoomHandlers,
} = require("./roomHandlers");

const {
  registerPlaybackHandlers,
} = require("./playbackHandlers");

const {
  registerRequestHandlers,
} = require("./requestHandlers");

const {
  registerParticipantHandlers,
} = require("./participantHandlers");
const { registerSocialHandlers } = require("./socialHandlers");

class SocketHandler {
  constructor(io) {
    this.io = io;
  }

  register() {
    this.io.on("connection", (socket) => {
      console.log(
        "User connected:",
        socket.id
      );

      this.registerHandlers(socket);
    });
  }

  registerHandlers(socket) {
    registerRoomHandlers(
      this.io,
      socket
    );

    registerPlaybackHandlers(
      this.io,
      socket
    );

    registerRequestHandlers(
      this.io,
      socket
    );

    registerParticipantHandlers(this.io, socket);
    registerSocialHandlers(this.io, socket);
  }
}

function registerSocketHandlers(io) {
  const socketHandler =
    new SocketHandler(io);

  socketHandler.register();
}

module.exports =
  registerSocketHandlers;