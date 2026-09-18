import { useEffect } from "react";
import { socket } from "../socket";

export function useRoomSocket() {
  useEffect(() => {
    // Only open the socket if there's actually a session to authenticate
    // with. Connecting unconditionally here meant a signed-out visitor on
    // the login page still triggered a connection attempt with no token,
    // which the server always rejects — and socket.io then retries that
    // failing connection forever in the background.
    const hasSession = Boolean(
      localStorage.getItem("watch_party_token")
    );

    if (!socket.connected && hasSession) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  return socket;
}