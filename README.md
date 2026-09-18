# YouTube Watch Party

Full-stack real-time YouTube Watch Party for the internship assignment.

# Demo Link
https://watchparty-jttq.onrender.com

## Implemented core requirements
- Room creation and room-code/link joining
- YouTube IFrame playback
- Socket.IO real-time synchronization for play, pause, seek and video changes
- Host / Moderator / Participant roles
- Server-side authorization on every privileged event
- Host role management and participant removal
- Participant playback request + approval workflow

## Bonus features implemented
- **OOP WebSocket architecture:** `Room`, `Participant`, `SocketHandler` and focused handler modules
- **Persistent rooms:** A durable JSON store (`server/data/watch-party.json`) stores room metadata, playback state, chat history and account-role membership; active rooms can be reloaded after server restart
- **Authentication:** registration/login with bcrypt password hashing and JWT session tokens
- **Text chat:** bounded room history (last 100 messages)
- **Emoji reactions:** 👍 😂 ❤️ 🔥 👏
- **Transfer host:** Host can transfer ownership to another participant
- **Redis scalability adapter:** set `REDIS_URL` to enable Socket.IO Redis Pub/Sub across multiple server instances
- **Participant request workflow:** Participants can request play/pause/seek/video-change and controllers can approve/reject

## Architecture
```text
React + TypeScript + YouTube IFrame
        |
        | Socket.IO
        v
Express + Socket.IO server
        |
        +-- SocketHandler
        |    +-- Room handlers
        |    +-- Playback handlers
        |    +-- Participant/role handlers
        |    +-- Request handlers
        |    +-- Social handlers
        |
        +-- Room / Participant OOP model
        +-- file-backed persistent store
        +-- JWT + bcrypt authentication
        +-- optional Redis Adapter for horizontal scaling
```

## Local setup
Requirements: Node.js 20+.

```bash
npm run install:all
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

For production:
```bash
npm run build
npm start
```

## Environment
Server `.env`:
```env
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
DATA_DIR=./data
CLIENT_ORIGIN=http://localhost:5173
# REDIS_URL=redis://localhost:6379
```
Client `.env`:
```env
VITE_SOCKET_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000
```

## Redis / 1000+ user scaling path
The Socket.IO Redis adapter is optional. With `REDIS_URL` configured, pub/sub lets multiple Node instances exchange Socket.IO events. Deploy multiple instances behind a load balancer and use a shared persistent database. For larger rooms, add connection limits/rate limiting and move high-frequency presence/playback telemetry to a dedicated pub/sub channel.

## Demo checklist
1. Register/login in two browser windows.
2. Window A creates a room and copies the link.
3. Window B joins with the room code.
4. Verify play/pause/seek/video changes synchronize.
5. Host promotes B to Moderator and later demotes it.
6. Participant requests a playback action and Host/Moderator approves it.
7. Send chat messages and emoji reactions.
8. Host transfers ownership to B.
9. Restart the server, log in again, and join the same room code to demonstrate SQLite persistence.
10. Host removes a participant.

The file-backed store is intentionally dependency-free for the assignment. For production, replace it with PostgreSQL/SQLite/MongoDB and keep Redis as the cross-instance Socket.IO adapter.

## Security notes
The UI only reflects permissions; authorization is enforced server-side. Passwords are hashed with bcrypt and sessions use signed JWTs. Set a strong `JWT_SECRET` in production and use HTTPS/WSS.
