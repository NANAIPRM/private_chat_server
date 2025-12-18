const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 10000;
const CHAT_PASSWORD = process.env.CHAT_PASSWORD || 'nanaiprm';

// เก็บ user ตาม socket.id
const users = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  // ===== JOIN =====
  socket.on('join', ({ username, avatar, password }) => {
    console.log('➡️ join event:', { username, avatar, password });

    if (password !== CHAT_PASSWORD) {
      console.log('❌ Wrong password from', socket.id);
      socket.emit('join-error', 'Wrong password');
      return;
    }

    users.set(socket.id, {
      username,
      avatar,
    });

    socket.emit('join-success');

    io.emit('message', {
      system: true,
      text: `🟢 ${avatar} ${username} joined the chat`,
    });

    console.log(`✅ ${username} joined chat`);
  });

  // ===== MESSAGE =====
  socket.on('message', (text) => {
    const user = users.get(socket.id);

    console.log('💬 message event:', text, 'from', user);

    if (!user) return;
    if (typeof text !== 'string' || !text.trim()) return;

    io.emit('message', {
      system: false,
      username: user.username,
      avatar: user.avatar,
      text,
      at: new Date().toISOString(),
    });
  });

  // ===== DISCONNECT =====
  socket.on('disconnect', () => {
    const user = users.get(socket.id);

    if (user) {
      io.emit('message', {
        system: true,
        text: `🔴 ${user.avatar} ${user.username} left the chat`,
      });

      users.delete(socket.id);
      console.log(`🔴 ${user.username} disconnected`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
