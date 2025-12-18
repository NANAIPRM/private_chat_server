require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const CHAT_PASSWORD = process.env.CHAT_PASSWORD;
const PORT = process.env.PORT || 4000;

// เก็บ user ไว้ใน memory
const users = new Map();
// socket.id => { username, avatar }

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  // 🔐 join ด้วย password
  socket.on('join', ({ username, avatar, password }) => {
    console.log('➡️ join event:', { username, avatar, password });

    if (!username || !avatar || !password) {
      socket.emit('join-error', 'Invalid join data');
      return;
    }

    if (password !== CHAT_PASSWORD) {
      console.log('❌ Wrong password from', socket.id);
      socket.emit('join-error', 'Wrong password');
      return;
    }

    users.set(socket.id, { username, avatar });

    console.log(`✅ ${username} joined chat`);

    socket.emit('join-success');

    io.emit('message', {
      system: true,
      text: `${avatar} ${username} joined the chat`,
      at: new Date().toISOString(),
    });
  });

  // 💬 ส่งข้อความ
  socket.on('message', (text) => {
    const user = users.get(socket.id);

    console.log('💬 message event:', text, 'from', user);

    // ❗ กันกรณียังไม่ join
    if (!user) {
      console.log('⚠️ message ignored (user not joined)');
      return;
    }

    if (!text || !text.trim()) return;

    io.emit('message', {
      system: false,
      username: user.username,
      avatar: user.avatar,
      text,
      at: new Date().toISOString(),
    });
  });

  // ❌ disconnect
  socket.on('disconnect', (reason) => {
    const user = users.get(socket.id);
    console.log('❌ Disconnected:', socket.id, reason);

    if (user) {
      io.emit('message', {
        system: true,
        text: `${user.avatar} ${user.username} left the chat`,
        at: new Date().toISOString(),
      });
    }

    users.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
