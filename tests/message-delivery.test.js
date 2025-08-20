const http = require('http');
const ioClient = require('socket.io-client');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { prisma } = require('../dist/prisma');


describe('message delivery', () => {
  let app, httpServer;
  let port = 4001;

  beforeAll(async () => {
    app = express();
    httpServer = http.createServer(app);
    const { createSocketServer } = require('../dist/socket');
    createSocketServer(httpServer);
    await new Promise((res) => httpServer.listen(port, res));
  });

  afterAll(async () => {
    await new Promise((res) => httpServer.close(res));
    await prisma.$disconnect();
  });

  function makeToken(userId){
    return jwt.sign({ userId }, process.env.JWT_SECRET);
  }

  function connect(token){
    return ioClient(`http://localhost:${port}`, { auth: { token } });
  }

  test('user A sends message, user B receives it', async () => {
    const rnd = Math.random().toString(36).slice(2);
    
    const a = await prisma.user.create({ data: { name: 'A', email: `a_${rnd}@example.com`, passwordHash: 'x' } });
    const b = await prisma.user.create({ data: { name: 'B', email: `b_${rnd}@example.com`, passwordHash: 'y' } });
    const room = await prisma.room.create({ data: { name: 'R', createdById: a.id, members: { create: [{ userId: a.id }, { userId: b.id }] } } });

    const sockA = connect(makeToken(a.id));
    const sockB = connect(makeToken(b.id));

    // Join room on both sockets
    await new Promise((resolve) => sockA.on('connect', resolve));
    await new Promise((resolve) => sockB.on('connect', resolve));
    sockA.emit('join_room', { roomId: room.id });
    sockB.emit('join_room', { roomId: room.id });

    const received = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 5000);
      sockB.on('receive_message', (p) => { clearTimeout(t); resolve(p); });
    });

    sockA.emit('send_message', { roomId: room.id, content: 'hello' });

    const payload = await received;
    expect(payload.content).toBe('hello');
    expect(payload.roomId).toBe(room.id);

    sockA.disconnect();
    sockB.disconnect();
  });
});

