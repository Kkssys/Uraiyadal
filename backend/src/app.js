require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('./models/User');
const Message = require('./models/Message');
const PrivateMessage = require('./models/PrivateMessage');
const authMiddleware = require('./middleware/auth');
const { sendOTPEmail } = require('./utils/emailService');

// Create express app
const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for profile picture uploads
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: profileFileFilter
});

// Configure multer for media uploads
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'media-' + uniqueSuffix + ext);
  }
});

const mediaFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|wav|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('File type not supported'));
  }
};

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFileFilter
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/media', express.static(path.join(__dirname, '../uploads/media')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Test auth route
app.get('/api/test-auth', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Auth working!', 
    user: { 
      id: req.user._id, 
      username: req.user.username,
      email: req.user.email 
    } 
  });
});

// ========== AUTH ROUTES ==========

// Register - Send OTP
app.post('/api/register', async (req, res) => {
  console.log('='.repeat(50));
  console.log('📝 Registration attempt:', req.body.email);
  
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`🎲 Generated OTP for ${email}: ${otpCode}`);
    
    const user = new User({
      email,
      username,
      password,
      isVerified: false,
      otpCode,
      otpExpiry,
      friends: [],
      blockedUsers: [],
      blockedBy: [],
      friendRequests: [],
      notifications: []
    });
    
    await user.save();
    console.log('✅ User saved to database');
    
    try {
      await sendOTPEmail(email, otpCode, username);
      console.log('✅ OTP email sent successfully');
      res.status(201).json({ 
        message: 'Registration successful! OTP sent to your email.',
        email: email,
        requiresOTP: true
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      res.status(201).json({ 
        message: `Registration successful! Your OTP is: ${otpCode}`,
        email: email,
        requiresOTP: true,
        testOTP: otpCode
      });
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  console.log('🔐 OTP verification attempt:', req.body.email);
  
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const user = await User.findOne({
      email,
      otpCode: otp,
      otpExpiry: { $gt: new Date() },
      isVerified: false
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log('✅ Email verified for:', user.username);
    
    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resend OTP
app.post('/api/resend-otp', async (req, res) => {
  console.log('📧 Resend OTP request for:', req.body.email);
  
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email, isVerified: false });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found or already verified' });
    }
    
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = newOtp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    
    console.log(`🎲 New OTP for ${email}: ${newOtp}`);
    
    try {
      await sendOTPEmail(email, newOtp, user.username);
      res.json({ message: 'New OTP sent to your email' });
    } catch (emailError) {
      res.json({ 
        message: `New OTP generated: ${newOtp}`,
        testOTP: newOtp
      });
    }
  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  console.log('🔐 Login attempt:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isVerified) {
      return res.status(401).json({ 
        error: 'Please verify your email first',
        requiresOTP: true,
        email: user.email
      });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log('✅ Login successful:', user.username);
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== FRIEND ROUTES ==========

// Get friends list
app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const friendsList = (req.user.friends || []).filter(
      id => !(req.user.blockedUsers || []).includes(id)
    );
    
    const friends = await User.find({
      _id: { $in: friendsList }
    }).select('username email profilePicture online lastSeen');
    
    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get friend requests
app.get('/api/friend-requests', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const pendingRequests = (req.user.friendRequests || []).filter(
      req => req && req.status === 'pending'
    );
    res.json(pendingRequests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users to send friend request
app.get('/api/search-new-users', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 2) {
      return res.status(400).json({ error: 'Please enter at least 2 characters' });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const excludeIds = [
      req.user._id,
      ...(req.user.friends || []),
      ...(req.user.blockedUsers || [])
    ];
    
    const users = await User.find({
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ],
      _id: { $nin: excludeIds }
    }).select('username email profilePicture online lastSeen').limit(10);
    
    const usersWithRequestStatus = users.map(user => {
      const requestSent = (req.user.friendRequests || []).some(
        req => req && req.from && req.from.toString() === user._id.toString() && req.status === 'pending'
      );
      
      return {
        ...user.toObject(),
        requestSent
      };
    });
    
    res.json(usersWithRequestStatus);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send friend request
app.post('/api/send-friend-request', authMiddleware, async (req, res) => {
  try {
    console.log('📨 Send friend request - Body:', req.body);
    
    if (!req.user || !req.user._id) {
      console.error('❌ No user in request');
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if ((req.user.blockedUsers || []).includes(userId)) {
      return res.status(400).json({ error: 'Cannot send request to blocked user' });
    }
    
    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if ((recipient.blockedUsers || []).includes(req.user._id.toString())) {
      return res.status(400).json({ error: 'You are blocked by this user' });
    }
    
    if ((req.user.friends || []).includes(userId)) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }
    
    const existingRequest = (recipient.friendRequests || []).find(
      r => r && r.from && r.from.toString() === req.user._id.toString() && r.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    if (!recipient.friendRequests) recipient.friendRequests = [];
    if (!recipient.notifications) recipient.notifications = [];
    
    recipient.friendRequests.push({
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture || null,
      status: 'pending',
      createdAt: new Date()
    });
    
    recipient.notifications.push({
      type: 'friend_request',
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture || null,
      message: `${req.user.username} sent you a friend request`,
      read: false,
      createdAt: new Date()
    });
    
    await recipient.save();
    
    console.log('✅ Friend request sent successfully');
    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('❌ Error sending friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept friend request
app.post('/api/accept-friend-request', authMiddleware, async (req, res) => {
  try {
    console.log('✅ Accept friend request - Body:', req.body);
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const { requestId } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    if (!req.user.friendRequests) req.user.friendRequests = [];
    if (!req.user.friends) req.user.friends = [];
    
    const requestIndex = req.user.friendRequests.findIndex(
      r => r && r._id && r._id.toString() === requestId && r.status === 'pending'
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    const request = req.user.friendRequests[requestIndex];
    const requester = await User.findById(request.from);
    
    if (!requester) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!requester.friends) requester.friends = [];
    if (!requester.notifications) requester.notifications = [];
    
    if (!req.user.friends.includes(request.from)) {
      req.user.friends.push(request.from);
    }
    
    if (!requester.friends.includes(req.user._id)) {
      requester.friends.push(req.user._id);
    }
    
    req.user.friendRequests[requestIndex].status = 'accepted';
    
    requester.notifications.push({
      type: 'friend_accept',
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture || null,
      message: `${req.user.username} accepted your friend request`,
      read: false,
      createdAt: new Date()
    });
    
    await req.user.save();
    await requester.save();
    
    console.log('✅ Friend request accepted');
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('❌ Error accepting friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject friend request
app.post('/api/reject-friend-request', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.body;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    const requestIndex = req.user.friendRequests.findIndex(
      r => r && r._id && r._id.toString() === requestId && r.status === 'pending'
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    req.user.friendRequests[requestIndex].status = 'rejected';
    await req.user.save();
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('❌ Error rejecting friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove friend
app.delete('/api/remove-friend/:friendId', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    req.user.friends = (req.user.friends || []).filter(id => id && id.toString() !== friendId);
    await req.user.save();
    
    const friend = await User.findById(friendId);
    if (friend) {
      friend.friends = (friend.friends || []).filter(id => id && id.toString() !== req.user._id.toString());
      await friend.save();
    }
    
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BLOCK/UNBLOCK ROUTES ==========

// Block user - COMPLETELY REWRITTEN
app.post('/api/block-user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🚫 Block user request');
    console.log('Current user ID:', req.user?._id);
    console.log('User to block ID:', userId);
    
    // Authentication check
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    
    // Find user to block
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Ensure arrays exist
    if (!req.user.blockedUsers) req.user.blockedUsers = [];
    if (!userToBlock.blockedBy) userToBlock.blockedBy = [];
    
    // Check if already blocked
    if (req.user.blockedUsers.includes(userId)) {
      return res.status(400).json({ error: 'User already blocked' });
    }
    
    // Remove from friends if exists
    const friendIndex = req.user.friends ? req.user.friends.indexOf(userId) : -1;
    if (friendIndex !== -1) {
      req.user.friends.splice(friendIndex, 1);
    }
    
    const friendIndexOther = userToBlock.friends ? userToBlock.friends.indexOf(req.user._id.toString()) : -1;
    if (friendIndexOther !== -1) {
      userToBlock.friends.splice(friendIndexOther, 1);
    }
    
    // Add to blocked list
    req.user.blockedUsers.push(userId);
    userToBlock.blockedBy.push(req.user._id);
    
    // Remove friend requests - safely using a new array
    if (req.user.friendRequests && req.user.friendRequests.length > 0) {
      const newRequests = [];
      for (let i = 0; i < req.user.friendRequests.length; i++) {
        const reqItem = req.user.friendRequests[i];
        if (reqItem && reqItem.from && reqItem.from.toString() !== userId) {
          newRequests.push(reqItem);
        }
      }
      req.user.friendRequests = newRequests;
    }
    
    if (userToBlock.friendRequests && userToBlock.friendRequests.length > 0) {
      const newRequests = [];
      for (let i = 0; i < userToBlock.friendRequests.length; i++) {
        const reqItem = userToBlock.friendRequests[i];
        if (reqItem && reqItem.from && reqItem.from.toString() !== req.user._id.toString()) {
          newRequests.push(reqItem);
        }
      }
      userToBlock.friendRequests = newRequests;
    }
    
    // Add notification
    if (!userToBlock.notifications) userToBlock.notifications = [];
    userToBlock.notifications.push({
      type: 'user_blocked',
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture || null,
      message: `${req.user.username} has blocked you`,
      read: false,
      createdAt: new Date()
    });
    
    await req.user.save();
    await userToBlock.save();
    
    // Emit socket event
    const io = req.app.get('io');
    const recipient = global.onlineUsers?.get(userId);
    if (recipient && io) {
      io.to(recipient.socketId).emit('user-blocked', {
        byUserId: req.user._id,
        byUsername: req.user.username
      });
    }
    
    console.log('✅ User blocked successfully');
    res.json({ 
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('❌ Error blocking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unblock user
app.delete('/api/unblock-user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔓 Unblock user request');
    console.log('Current user ID:', req.user?._id);
    console.log('User to unblock ID:', userId);
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const userToUnblock = await User.findById(userId);
    if (!userToUnblock) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!req.user.blockedUsers) req.user.blockedUsers = [];
    if (!userToUnblock.blockedBy) userToUnblock.blockedBy = [];
    
    if (!req.user.blockedUsers.includes(userId)) {
      return res.status(400).json({ error: 'User is not blocked' });
    }
    
    // Remove from blocked lists
    req.user.blockedUsers = req.user.blockedUsers.filter(id => id.toString() !== userId);
    userToUnblock.blockedBy = userToUnblock.blockedBy.filter(id => id.toString() !== req.user._id.toString());
    
    // Add notification
    if (!userToUnblock.notifications) userToUnblock.notifications = [];
    userToUnblock.notifications.push({
      type: 'user_unblocked',
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture || null,
      message: `${req.user.username} has unblocked you`,
      read: false,
      createdAt: new Date()
    });
    
    await req.user.save();
    await userToUnblock.save();
    
    const io = req.app.get('io');
    const recipient = global.onlineUsers?.get(userId);
    if (recipient && io) {
      io.to(recipient.socketId).emit('user-unblocked', {
        byUserId: req.user._id,
        byUsername: req.user.username
      });
    }
    
    console.log('✅ User unblocked successfully');
    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('❌ Error unblocking user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get blocked users list
app.get('/api/blocked-users', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const blockedUsers = await User.find({
      _id: { $in: req.user.blockedUsers || [] }
    }).select('username email profilePicture');
    
    res.json(blockedUsers);
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user is blocked
app.get('/api/check-blocked/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const isBlocked = (req.user.blockedUsers || []).includes(userId);
    const isBlockedBy = (req.user.blockedBy || []).includes(userId);
    
    res.json({ isBlocked, isBlockedBy });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== NOTIFICATION ROUTES ==========

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = req.user.notifications || [];
    const unreadCount = notifications.filter(n => !n.read).length;
    const recentNotifications = notifications.slice(-20).reverse();
    res.json({ unreadCount, notifications: recentNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mark-notification-read/:notificationId', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notificationIndex = req.user.notifications.findIndex(
      n => n && n._id && n._id.toString() === notificationId
    );
    
    if (notificationIndex !== -1) {
      req.user.notifications[notificationIndex].read = true;
      await req.user.save();
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== MESSAGE ROUTES ==========

app.get('/api/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if ((req.user.blockedUsers || []).includes(userId)) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }
    
    const messages = await PrivateMessage.find({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id }
      ]
    }).sort({ createdAt: 1 }).limit(100);
    
    res.json(messages);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages.reverse());
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-media-message', authMiddleware, uploadMedia.single('media'), async (req, res) => {
  try {
    const { toUserId, messageType, caption } = req.body;
    
    if ((req.user.blockedUsers || []).includes(toUserId)) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }
    
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if ((toUser.blockedUsers || []).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'You are blocked by this user' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const mediaUrl = `/uploads/media/${req.file.filename}`;
    
    const message = new PrivateMessage({
      from: req.user._id,
      fromUsername: req.user.username,
      fromProfilePicture: req.user.profilePicture,
      to: toUserId,
      toUsername: toUser.username,
      toProfilePicture: toUser.profilePicture,
      content: caption || null,
      messageType: messageType || 'file',
      mediaUrl,
      mediaName: req.file.originalname,
      mediaSize: req.file.size,
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
      mediaUrl: message.mediaUrl,
      mediaName: message.mediaName,
      mediaSize: message.mediaSize,
      createdAt: message.createdAt,
      read: message.read,
      delivered: message.delivered,
      deletedBy: message.deletedBy,
      deletedForEveryone: message.deletedForEveryone
    };
    
    const io = req.app.get('io');
    const recipient = global.onlineUsers?.get(toUserId);
    if (recipient && io) {
      message.delivered = true;
      message.deliveredAt = new Date();
      await message.save();
      messageData.delivered = true;
      messageData.deliveredAt = message.deliveredAt;
      
      io.to(recipient.socketId).emit('private-message-received', messageData);
    }
    
    res.json({ message: 'Media sent successfully', messageData });
  } catch (error) {
    console.error('Error sending media message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download-media/:filename', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/media', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== MESSAGE DELETION ROUTES ==========

app.delete('/api/delete-message-for-me/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await PrivateMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.from.toString() !== req.user._id.toString() && 
        message.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }
    
    const io = req.app.get('io');
    const recipientId = message.from.toString() === req.user._id.toString() 
      ? message.to.toString() 
      : message.from.toString();
    const recipient = global.onlineUsers?.get(recipientId);
    
    if (recipient && io) {
      io.to(recipient.socketId).emit('message-deleted-for-me', {
        messageId,
        deletedBy: req.user._id
      });
    }
    
    res.json({ message: 'Message deleted for you' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete-message-for-everyone/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await PrivateMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.from.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the sender can delete for everyone' });
    }
    
    message.messageType = 'deleted';
    message.content = null;
    message.mediaUrl = null;
    message.mediaName = null;
    message.mediaSize = null;
    message.deletedForEveryone = true;
    await message.save();
    
    const io = req.app.get('io');
    io.emit('message-deleted-for-everyone', { messageId });
    
    res.json({ message: 'Message deleted for everyone' });
  } catch (error) {
    console.error('Error deleting message for everyone:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clear-chat/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await PrivateMessage.find({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id }
      ]
    });
    
    for (const message of messages) {
      if (!message.deletedBy.includes(req.user._id)) {
        message.deletedBy.push(req.user._id);
        await message.save();
      }
    }
    
    const io = req.app.get('io');
    const recipient = global.onlineUsers?.get(userId);
    
    if (recipient && io) {
      io.to(recipient.socketId).emit('chat-cleared', {
        clearedBy: req.user._id,
        clearedByUsername: req.user.username
      });
    }
    
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SETTINGS ROUTES ==========

app.put('/api/update-username', authMiddleware, async (req, res) => {
  try {
    const { newUsername } = req.body;
    
    if (!newUsername || newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const oldUsername = req.user.username;
    req.user.username = newUsername;
    await req.user.save();
    
    await Message.updateMany(
      { senderUsername: oldUsername },
      { senderUsername: newUsername }
    );
    
    await PrivateMessage.updateMany(
      { fromUsername: oldUsername },
      { fromUsername: newUsername }
    );
    
    await PrivateMessage.updateMany(
      { toUsername: oldUsername },
      { toUsername: newUsername }
    );
    
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      message: 'Username updated successfully',
      token,
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        profilePicture: req.user.profilePicture
      }
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-profile-picture', authMiddleware, uploadProfile.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (req.user.profilePicture) {
      const oldImagePath = path.join(__dirname, '..', req.user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    const profilePictureUrl = `/uploads/${req.file.filename}`;
    req.user.profilePicture = profilePictureUrl;
    await req.user.save();
    
    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl,
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        profilePicture: req.user.profilePicture
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/remove-profile-picture', authMiddleware, async (req, res) => {
  try {
    if (req.user.profilePicture) {
      const imagePath = path.join(__dirname, '..', req.user.profilePicture);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      req.user.profilePicture = null;
      await req.user.save();
    }
    
    res.json({
      message: 'Profile picture removed successfully',
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        profilePicture: null
      }
    });
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-settings', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
        createdAt: req.user.createdAt,
        isVerified: req.user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Chat App API is running' });
});

module.exports = app;