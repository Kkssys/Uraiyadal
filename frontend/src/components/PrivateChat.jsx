import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MediaMessage from './MediaMessage';
import MessageMenu from './MessageMenu';
import { useTheme } from '../context/ThemeContext';

const PrivateChat = ({ user, selectedUser, socket, onClose, onUnblock }) => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clearingChat, setClearingChat] = useState(false);
  const [activeMenuMessage, setActiveMenuMessage] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const checkBlockStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/check-blocked/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking block status:', error);
      return { isBlocked: false, isBlockedBy: false };
    }
  };

  const markMessageAsRead = async (messageId) => {
    if (socket) {
      socket.emit('mark-message-read', { messageId });
    }
  };

  const markAllMessagesAsRead = async () => {
    if (socket && selectedUser) {
      socket.emit('mark-messages-read', { fromUserId: selectedUser._id });
      setMessages(prev => prev.map(msg => 
        msg.from === selectedUser._id && !msg.read
          ? { ...msg, read: true, readAt: new Date() }
          : msg
      ));
    }
  };

  const reloadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/conversation/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const visibleMessages = response.data.filter(msg => 
        !msg.deletedBy?.includes(user.id)
      );
      setMessages(visibleMessages);
      setTimeout(() => scrollToBottom(), 100);
      markAllMessagesAsRead();
    } catch (error) {
      console.error('Error reloading messages:', error);
    }
  };

  useEffect(() => {
    if (selectedUser && socket) {
      loadConversation();
      checkBlockStatus();
      markAllMessagesAsRead();
      
      socket.on('private-message-received', (message) => {
        if (message.from === selectedUser._id) {
          setMessages(prev => [...prev, message]);
          if (socket) {
            socket.emit('mark-message-read', { messageId: message._id });
          }
        }
      });
      
      socket.on('private-message-sent', (message) => {
        setMessages(prev => [...prev, message]);
      });
      
      socket.on('message-read', (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, read: true, readAt: data.readAt }
            : msg
        ));
      });
      
      socket.on('messages-read', (data) => {
        if (data.fromUserId === selectedUser._id) {
          setMessages(prev => prev.map(msg => 
            msg.from === selectedUser._id && !msg.read
              ? { ...msg, read: true, readAt: new Date() }
              : msg
          ));
        }
      });
      
      socket.on('message-delivered', (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, delivered: true, deliveredAt: data.deliveredAt }
            : msg
        ));
      });
      
      socket.on('user-typing-private', (data) => {
        if (data.fromUserId === selectedUser._id) {
          setIsTyping(data.isTyping);
        }
      });
      
      socket.on('message-deleted-for-me', (data) => {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      });
      
      socket.on('message-deleted-for-everyone', (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, messageType: 'deleted', content: null, mediaUrl: null, mediaName: null }
            : msg
        ));
      });
      
      socket.on('chat-cleared', (data) => {
        if (data.clearedBy !== user.id) {
          setMessages([]);
        }
      });
      
      socket.on('user-blocked', (data) => {
        if (data.byUserId === selectedUser._id) {
          setBlockStatus(prev => ({ ...prev, isBlockedBy: true }));
        }
      });
      
      socket.on('user-unblocked', async (data) => {
        if (data.byUserId === selectedUser._id) {
          setBlockStatus(prev => ({ ...prev, isBlockedBy: false }));
          await reloadMessages();
          if (onUnblock) onUnblock();
        }
      });
      
      socket.on('unblock-successful', async (data) => {
        if (data.unblockedUserId === selectedUser._id) {
          setBlockStatus(prev => ({ ...prev, isBlocked: false }));
          await reloadMessages();
          if (onUnblock) onUnblock();
          setShowUnblockConfirm(false);
        }
      });
      
      return () => {
        socket.off('private-message-received');
        socket.off('private-message-sent');
        socket.off('message-read');
        socket.off('messages-read');
        socket.off('message-delivered');
        socket.off('user-typing-private');
        socket.off('message-deleted-for-me');
        socket.off('message-deleted-for-everyone');
        socket.off('chat-cleared');
        socket.off('user-blocked');
        socket.off('user-unblocked');
        socket.off('unblock-successful');
      };
    }
  }, [selectedUser, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/conversation/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const visibleMessages = response.data.filter(msg => 
        !msg.deletedBy?.includes(user.id)
      );
      setMessages(visibleMessages);
      markAllMessagesAsRead();
    } catch (error) {
      if (error.response?.status === 403) {
        checkBlockStatus();
      }
      console.error('Error loading conversation:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socket && selectedUser && !blockStatus.isBlocked && !blockStatus.isBlockedBy) {
      socket.emit('private-message', {
        toUserId: selectedUser._id,
        content: messageInput
      });
      setMessageInput('');
      handleTyping(false);
    }
  };

  const handleTyping = (isTypingNow) => {
    if (typing === isTypingNow) return;
    setTyping(isTypingNow);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (!blockStatus.isBlocked && !blockStatus.isBlockedBy) {
      socket.emit('typing-private', {
        toUserId: selectedUser._id,
        isTyping: isTypingNow
      });
    }
    
    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 1000);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (blockStatus.isBlocked || blockStatus.isBlockedBy) {
      alert('Cannot send messages to blocked user or you are blocked');
      return;
    }
    
    let messageType = 'file';
    if (file.type.startsWith('image/')) messageType = 'image';
    else if (file.type.startsWith('video/')) messageType = 'video';
    else if (file.type.startsWith('audio/')) messageType = 'audio';
    
    const formData = new FormData();
    formData.append('media', file);
    formData.append('toUserId', selectedUser._id);
    formData.append('messageType', messageType);
    if (messageInput.trim()) {
      formData.append('caption', messageInput);
      setMessageInput('');
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/send-media-message', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setMessages(prev => [...prev, response.data.messageData]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  const handleClearChat = async () => {
    if (window.confirm(`Are you sure you want to clear all messages with ${selectedUser.username}? This action cannot be undone.`)) {
      setClearingChat(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/clear-chat/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages([]);
        
        if (socket) {
          socket.emit('chat-cleared', {
            clearedBy: user.id,
            clearedByUsername: user.username,
            withUserId: selectedUser._id
          });
        }
        
        alert('Chat history cleared successfully');
      } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Failed to clear chat history');
      } finally {
        setClearingChat(false);
      }
    }
  };

  const handleDeleteMessage = (messageId, type) => {
    if (type === 'me') {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } else if (type === 'everyone') {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, messageType: 'deleted', content: null, mediaUrl: null, mediaName: null }
          : msg
      ));
    }
    setActiveMenuMessage(null);
  };

  const handleUnblock = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/unblock-user/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (socket) {
        socket.emit('user-unblocked-socket', {
          unblockedUserId: selectedUser._id,
          unblockedUsername: selectedUser.username,
          unblockedByUserId: user.id,
          unblockedByUsername: user.username
        });
      }
      
      setBlockStatus(prev => ({ ...prev, isBlocked: false }));
      setShowUnblockConfirm(false);
      await reloadMessages();
      if (onUnblock) onUnblock();
      
      alert('User unblocked successfully. Old messages restored.');
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Unknown';
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getLastSeenText = () => {
    if (selectedUser.online) return '🟢 Online';
    return `Last seen ${formatLastSeen(selectedUser.lastSeen)}`;
  };

  const getMessageStatus = (msg) => {
    if (msg.from === user.id) {
      if (msg.read) {
        return `✓✓ Seen ${formatFullDate(msg.readAt)}`;
      } else if (msg.delivered) {
        return `✓✓ Delivered ${formatFullDate(msg.deliveredAt)}`;
      } else {
        return `✓ Sent ${formatFullDate(msg.createdAt)}`;
      }
    }
    return null;
  };

  const renderMessage = (msg, idx) => {
    if (msg.messageType === 'deleted') {
      return (
        <div
          key={msg._id || idx}
          style={{
            ...styles.message,
            justifyContent: 'center'
          }}
        >
          <div style={{...styles.deletedMessage, backgroundColor: colors.surfaceLight, color: colors.textLighter}}>
            <span>🗑️ Message has been deleted</span>
          </div>
        </div>
      );
    }
    
    if (msg.messageType === 'text' || !msg.messageType) {
      const isOwn = msg.from === user.id;
      const messageStatus = getMessageStatus(msg);
      
      return (
        <div
          key={msg._id || idx}
          style={{
            ...styles.message,
            justifyContent: isOwn ? 'flex-end' : 'flex-start'
          }}
          onMouseEnter={() => {
            if (!isOwn && !msg.read && socket) {
              markMessageAsRead(msg._id);
            }
          }}
        >
          <div
            style={{
              ...styles.messageBubble,
              backgroundColor: isOwn ? colors.primary : colors.surfaceLight,
              color: isOwn ? colors.messageSentText : colors.messageReceivedText,
              position: 'relative'
            }}
          >
            <div style={styles.messageContent}>{msg.content}</div>
            <div style={styles.messageFooter}>
              <span style={styles.messageTime}>
                {formatTime(msg.createdAt)}
              </span>
              {isOwn && (
                <span style={styles.messageStatus} title={messageStatus}>
                  {msg.read ? '✓✓' : (msg.delivered ? '✓✓' : '✓')}
                </span>
              )}
              <button 
                style={{...styles.menuButton, color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textLighter}}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessage(activeMenuMessage === msg._id ? null : msg._id);
                }}
              >
                ⋮
              </button>
            </div>
            {isOwn && msg.read && msg.readAt && (
              <div style={styles.readReceipt}>
                Seen {formatFullDate(msg.readAt)}
              </div>
            )}
            {activeMenuMessage === msg._id && (
              <div style={styles.menuContainer}>
                <MessageMenu 
                  message={msg}
                  currentUser={user}
                  onDelete={handleDeleteMessage}
                  onClose={() => setActiveMenuMessage(null)}
                />
              </div>
            )}
          </div>
        </div>
      );
    } 
    
    return (
      <div
        key={msg._id || idx}
        style={{
          ...styles.message,
          justifyContent: msg.from === user.id ? 'flex-end' : 'flex-start'
        }}
        onMouseEnter={() => {
          if (msg.from !== user.id && !msg.read && socket) {
            markMessageAsRead(msg._id);
          }
        }}
      >
        <MediaMessage 
          message={msg} 
          isOwn={msg.from === user.id}
          currentUser={user}
          onDelete={handleDeleteMessage}
        />
        {msg.from === user.id && msg.read && msg.readAt && (
          <div style={styles.readReceiptMedia}>
            Seen {formatFullDate(msg.readAt)}
          </div>
        )}
      </div>
    );
  };

  const dynamicStyles = {
    chatWindow: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.background
    },
    chatHeader: {
      padding: '20px',
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerName: {
      margin: 0,
      fontSize: '18px',
      color: colors.text
    },
    headerStatus: {
      margin: '5px 0 0 0',
      fontSize: '12px',
      color: colors.textLight
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    },
    noMessages: {
      textAlign: 'center',
      marginTop: '50px',
      color: colors.textLighter
    },
    typingIndicator: {
      fontSize: '12px',
      color: colors.textLight,
      fontStyle: 'italic',
      padding: '10px',
      marginBottom: '10px'
    },
    uploadingIndicator: {
      fontSize: '12px',
      color: colors.primary,
      textAlign: 'center',
      padding: '10px'
    },
    inputForm: {
      display: 'flex',
      padding: '20px',
      backgroundColor: colors.surface,
      borderTop: `1px solid ${colors.border}`,
      gap: '10px'
    },
    messageInput: {
      flex: 1,
      padding: '12px',
      fontSize: '14px',
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: '5px',
      outline: 'none',
      backgroundColor: colors.inputBackground,
      color: colors.text
    },
    blockedWarning: {
      padding: '10px',
      backgroundColor: '#ff9800',
      color: 'white',
      textAlign: 'center',
      fontSize: '12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap'
    },
    blockedWarningButton: {
      background: 'white',
      border: 'none',
      borderRadius: '5px',
      padding: '5px 10px',
      cursor: 'pointer',
      color: '#ff9800',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={dynamicStyles.chatWindow}>
      <div style={dynamicStyles.chatHeader}>
        <div style={styles.headerInfo}>
          {selectedUser.profilePicture ? (
            <img 
              src={`http://localhost:5000${selectedUser.profilePicture}`}
              alt={selectedUser.username}
              style={styles.avatarImage}
            />
          ) : (
            <div style={{...styles.avatar, backgroundColor: colors.primary}}>
              {selectedUser.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 style={dynamicStyles.headerName}>{selectedUser.username}</h3>
            <p style={dynamicStyles.headerStatus}>{getLastSeenText()}</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={handleClearChat} 
            style={{...styles.clearChatButton, backgroundColor: colors.warning}}
            disabled={clearingChat || messages.length === 0}
            title="Clear all messages"
          >
            🗑️ Clear Chat
          </button>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
      </div>
      
      {blockStatus.isBlockedBy && (
        <div style={dynamicStyles.blockedWarning}>
          ⚠️ You have been blocked by {selectedUser.username}. You cannot send messages.
        </div>
      )}
      
      {blockStatus.isBlocked && !blockStatus.isBlockedBy && (
        <div style={dynamicStyles.blockedWarning}>
          🔒 You have blocked {selectedUser.username}. 
          <button 
            onClick={() => setShowUnblockConfirm(true)} 
            style={dynamicStyles.blockedWarningButton}
          >
            Unblock
          </button>
        </div>
      )}

      {showUnblockConfirm && (
        <div style={styles.confirmOverlay}>
          <div style={{...styles.confirmModal, backgroundColor: colors.surface}}>
            <h4 style={{color: colors.text}}>Unblock {selectedUser.username}?</h4>
            <p style={{color: colors.textLight}}>You will be able to send messages to this user again. Old messages will reappear.</p>
            <div style={styles.confirmButtons}>
              <button onClick={() => setShowUnblockConfirm(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleUnblock} style={styles.confirmUnblockButton}>
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={dynamicStyles.messagesArea}>
        {messages.length === 0 ? (
          <div style={dynamicStyles.noMessages}>
            <p>💭 No messages yet</p>
            <p style={styles.noMessagesSub}>Send a message to start chatting!</p>
          </div>
        ) : (
          messages.map((msg, idx) => renderMessage(msg, idx))
        )}
        {isTyping && (
          <div style={dynamicStyles.typingIndicator}>
            {selectedUser.username} is typing...
          </div>
        )}
        {uploading && (
          <div style={dynamicStyles.uploadingIndicator}>
            Uploading... {uploadProgress}%
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} style={dynamicStyles.inputForm}>
        <button 
          type="button" 
          onClick={() => fileInputRef.current.click()} 
          style={{...styles.attachButton, backgroundColor: colors.surfaceLight, color: colors.text}}
          disabled={uploading || blockStatus.isBlocked || blockStatus.isBlockedBy}
          title={blockStatus.isBlocked || blockStatus.isBlockedBy ? "Cannot send messages to blocked user" : "Attach file"}
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
        />
        <input
          type="text"
          value={messageInput}
          onChange={(e) => {
            setMessageInput(e.target.value);
            handleTyping(true);
          }}
          onBlur={() => handleTyping(false)}
          placeholder={blockStatus.isBlocked || blockStatus.isBlockedBy ? "Cannot send messages - user is blocked" : `Message ${selectedUser.username}...`}
          style={dynamicStyles.messageInput}
          disabled={uploading || blockStatus.isBlocked || blockStatus.isBlockedBy}
        />
        <button 
          type="submit" 
          style={{...styles.sendButton, backgroundColor: colors.primary}} 
          disabled={uploading || blockStatus.isBlocked || blockStatus.isBlockedBy || !messageInput.trim()}
        >
          {uploading ? `${uploadProgress}%` : 'Send 📤'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  avatarImage: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  clearChatButton: {
    padding: '6px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.3s'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999'
  },
  noMessagesSub: {
    fontSize: '12px',
    marginTop: '10px'
  },
  message: {
    display: 'flex',
    marginBottom: '15px',
    position: 'relative'
  },
  messageBubble: {
    padding: '10px 15px',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    maxWidth: '70%',
    position: 'relative'
  },
  messageContent: {
    fontSize: '14px',
    wordWrap: 'break-word'
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '8px',
    marginTop: '5px'
  },
  messageTime: {
    fontSize: '10px',
    opacity: 0.7
  },
  messageStatus: {
    fontSize: '10px',
    marginLeft: '5px',
    opacity: 0.7
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 5px',
    borderRadius: '3px',
    transition: 'background-color 0.2s'
  },
  menuContainer: {
    position: 'absolute',
    bottom: '100%',
    right: '0',
    zIndex: 100
  },
  readReceipt: {
    fontSize: '9px',
    opacity: 0.6,
    marginTop: '4px',
    textAlign: 'right'
  },
  readReceiptMedia: {
    fontSize: '9px',
    opacity: 0.6,
    marginTop: '2px',
    textAlign: 'right',
    clear: 'both'
  },
  deletedMessage: {
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: '200px',
    margin: '5px auto'
  },
  attachButton: {
    padding: '12px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s'
  },
  sendButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  confirmOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  confirmModal: {
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
    minWidth: '280px'
  },
  confirmButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'center'
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#999',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  confirmUnblockButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  }
};

export default PrivateChat;