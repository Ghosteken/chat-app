import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import authRoutes from './routes/auth';
import roomsRoutes from './routes/rooms';
import membersRoutes from './routes/members';
import { createSocketServer } from './socket';

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
// Explicit root route (Docker hosts)
app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api', membersRoutes);

// Fallback: SPA-like routing to index.html for any non-API path (for non-API routes)
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// Generic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
createSocketServer(server);

server.listen(config.PORT, () => {
  console.log(`Server listening on :${config.PORT}`);
});

