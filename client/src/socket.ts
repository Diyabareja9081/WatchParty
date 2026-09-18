import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token: localStorage.getItem('watch_party_token') }),
});
