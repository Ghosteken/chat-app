import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth';
import roomsRoutes from './routes/rooms';
import { createSocketServer } from './socket';

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);

const server = http.createServer(app);
createSocketServer(server);

server.listen(config.PORT, () => {
  console.log(`Server listening on :${config.PORT}`);
});

