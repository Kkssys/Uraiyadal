require('dotenv').config();

const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./models/User');
const PrivateMessage = require('./models/PrivateMessage');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);

// Configure Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://uraiyadal-chat.netlify.app",
      "https://transcendent-piroshki-be2b86.netlify.app",
      "https://uraiyadal-o842.onrender.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Track online users
const onlineUsers = new Map();

// Make onlineUsers and io accessible globally
global.onlineUsers = onlineUsers;
app.set('io', io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isVerified) {
      return next(new Error('Authentication error'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  if (!socket.user) {
    socket.disconnect();
    return;
  }

  const currentUser = socket.user;
  const userId = currentUser._id.toString();
  
  console.log(`✅ User connected: ${currentUser.username}`);

  // Store user in online users map
  onlineUsers.set(userId, {
    userId: userId,
    username: currentUser.username,
    profilePicture: currentUser.profilePicture,
    socketId: socket.id,
    lastSeen: currentUser.lastSeen
  });
  
  // Update user status in database
  User.findByIdAndUpdate(userId, { 
    online: true, 
    lastSeen: new Date() 
  }).then(async () => {
    const allOnlineUsers = [];
    for (const [id, userData] of onlineUsers.entries()) {
      const user = await User.findById(id).select('username profilePicture lastSeen online');
      allOnlineUsers.push({
        userId: id,
        username: userData.username,
        profilePicture: userData.profilePicture,
        online: true,
        lastSeen: user?.lastSeen || new Date()
      });
    }
    
    io.emit('online-users-update', allOnlineUsers);
    console.log(`📡 Online users update sent: ${allOnlineUsers.length} users online`);
  });

  // Handle get user status
  socket.on('get-user-status', async (data) => {
    try {
      const { userId } = data;
      const user = await User.findById(userId).select('username online lastSeen profilePicture');
      if (user) {
        socket.emit('user-status-response', {
          userId: user._id,
          username: user.username,
          online: user.online,
          lastSeen: user.lastSeen,
          profilePicture: user.profilePicture
        });
      }
    } catch (error) {
      console.error('Error getting user status:', error);
    }
  });

  // Handle private message
  socket.on('private-message', async (data) => {
    try {
      const { toUserId, content } = data;
      
      if (!toUserId || !content) {
        socket.emit('message-error', { error: 'Missing required fields' });
        return;
      }
      
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        socket.emit('message-error', { error: 'User not found' });
        return;
      }
      
      // Check block status
      if (currentUser.blockedUsers && currentUser.blockedUsers.includes(toUserId)) {
        socket.emit('message-error', { error: 'You have blocked this user' });
        return;
      }
      
      if (toUser.blockedUsers && toUser.blockedUsers.includes(currentUser._id.toString())) {
        socket.emit('message-error', { error: 'You are blocked by this user' });
        return;
      }
      
      const message = new PrivateMessage({
        from: currentUser._id,
        fromUsername: currentUser.username,
        fromProfilePicture: currentUser.profilePicture,
        to: toUserId,
        toUsername: toUser.username,
        toProfilePicture: toUser.profilePicture,
        content: content,
        messageType: 'text',
        read: false,
        delivered: false,
        deletedBy: [],
        deletedForEveryone: false
      });
      
      await message.save();
      
      const messageData = {
        _id: message._id,
        from: message.from,
        fromUsername: message.fromUsername,
        fromProfilePicture: message.fromProfilePicture,
        to: message.to,
        toUsername: message.toUsername,
        toProfilePicture: message.toProfilePicture,
        content: message.content,
        messageType: message.messageType,
        createdAt: message.createdAt,
        read: message.read,
        delivered: false,
        deletedBy: message.deletedBy,
        deletedForEveryone: message.deletedForEveryone
      };
      
      socket.emit('private-message-sent', messageData);
      
      const recipient = onlineUsers.get(toUserId);
      if (recipient) {
        message.delivered = true;
        message.deliveredAt = new Date();
        await message.save();
        messageData.delivered = true;
        messageData.deliveredAt = message.deliveredAt;
        
        io.to(recipient.socketId).emit('private-message-received', messageData);
        socket.emit('message-delivered', {
          messageId: message._id,
          deliveredAt: message.deliveredAt
        });
      }
      
    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  // Handle mark message as read
  socket.on('mark-message-read', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await PrivateMessage.findById(messageId);
      if (!message) return;
      
      if (message.to.toString() === currentUser._id.toString() && !message.read) {
        message.read = true;
        message.readAt = new Date();
        await message.save();
        
        const sender = onlineUsers.get(message.from.toString());
        if (sender) {
          io.to(sender.socketId).emit('message-read', {
            messageId: messageId,
            readAt: message.readAt,
            readBy: currentUser.username
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // Handle typing in private chat
  socket.on('typing-private', (data) => {
    const { toUserId, isTyping } = data;
    const recipient = onlineUsers.get(toUserId);
    if (recipient) {
      io.to(recipient.socketId).emit('user-typing-private', {
        fromUserId: userId,
        fromUsername: currentUser.username,
        fromProfilePicture: currentUser.profilePicture,
        isTyping: isTyping
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${currentUser.username}`);
    
    onlineUsers.delete(userId);
    
    await User.findByIdAndUpdate(userId, {
      online: false,
      lastSeen: new Date()
    });
    
    const remainingOnlineUsers = [];
    for (const [id, userData] of onlineUsers.entries()) {
      const user = await User.findById(id).select('username profilePicture lastSeen online');
      remainingOnlineUsers.push({
        userId: id,
        username: userData.username,
        profilePicture: userData.profilePicture,
        online: true,
        lastSeen: user?.lastSeen || new Date()
      });
    }
    
    io.emit('online-users-update', remainingOnlineUsers);
    console.log(`📡 Online users updated: ${remainingOnlineUsers.length} users`);
  });
});

module.exports = { server, io };