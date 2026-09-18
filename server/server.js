const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { register, login, userFromToken } = require('./src/auth');


const { PORT } = require('./src/config/constants');
const registerSocketHandlers = require('./src/socket/socketHandler');

const app = express();
const server = http.createServer(app);

const clientDist = path.resolve(__dirname, '../client/dist');
const clientOrigin = process.env.CLIENT_ORIGIN || '*';

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '32kb' }));

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    socket.data.user = userFromToken(token);
    next();
  } catch { next(new Error('Invalid or expired authentication token.')); }
});

app.post('/api/auth/register', (req, res) => { try { const result = register(req.body.username, req.body.password); res.status(201).json(result); } catch (e) { res.status(400).json({ message: e.message }); } });
app.post('/api/auth/login', (req, res) => { try { const result = login(req.body.username, req.body.password); res.json(result); } catch (e) { res.status(401).json({ message: e.message }); } });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'youtube-watch-party' });
});

// Serve the production Vite build when it exists. This lets the same
// Node server host both the React app and the Socket.IO endpoint.
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error) next();
  });
});

async function configureRedis() {
  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const { createClient } = require('redis');
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter enabled.');
    } catch (error) { console.error('Redis adapter unavailable:', error.message); }
  }
  registerSocketHandlers(io);
}
configureRedis();

server.listen(PORT, () => {
  console.log(`Watch Party server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
