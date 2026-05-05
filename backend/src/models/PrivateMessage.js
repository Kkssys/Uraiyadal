const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromUsername: {
    type: String,
    required: true
  },
  fromProfilePicture: {
    type: String,
    default: null
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUsername: {
    type: String,
    required: true
  },
  toProfilePicture: {
    type: String,
    default: null
  },
  content: {
    type: String,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'deleted'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaName: {
    type: String,
    default: null
  },
  mediaSize: {
    type: Number,
    default: null
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
privateMessageSchema.index({ from: 1, to: 1, createdAt: -1 });
privateMessageSchema.index({ to: 1, read: 1 });

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);