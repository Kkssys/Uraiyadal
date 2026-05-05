import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FriendButton = ({ user, targetUser, onStatusChange, socket }) => {
  const [status, setStatus] = useState('none'); // none, pending, received, friends
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);

  useEffect(() => {
    checkFriendStatus();
  }, [targetUser]);

  useEffect(() => {
    if (socket) {
      socket.on('friend-request-received', ({ fromUserId }) => {
        if (fromUserId === targetUser._id) {
          setStatus('received');
          setRequestId(null);
        }
      });
      
      socket.on('friend-request-accepted', ({ fromUserId }) => {
        if (fromUserId === targetUser._id) {
          setStatus('friends');
          if (onStatusChange) onStatusChange('friends');
        }
      });
      
      socket.on('friend-request-cancelled', ({ fromUserId }) => {
        if (fromUserId === targetUser._id) {
          setStatus('none');
        }
      });
      
      return () => {
        socket.off('friend-request-received');
        socket.off('friend-request-accepted');
        socket.off('friend-request-cancelled');
      };
    }
  }, [socket, targetUser]);

  const checkFriendStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      // Check if already friends
      const friendsResponse = await axios.get('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const isFriend = friendsResponse.data.some(friend => friend._id === targetUser._id);
      if (isFriend) {
        setStatus('friends');
        return;
      }
      
      // Check pending requests
      const requestsResponse = await axios.get('/api/friend-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check if user sent request to target
      const sentRequest = requestsResponse.data.find(
        req => req.from === targetUser._id && req.status === 'pending'
      );
      if (sentRequest) {
        setStatus('received');
        setRequestId(sentRequest._id);
        return;
      }
      
      // Check if target sent request to user (need to check from user's perspective)
      const receivedRequest = requestsResponse.data.find(
        req => req.from === targetUser._id
      );
      if (receivedRequest && receivedRequest.status === 'pending') {
        setStatus('received');
        setRequestId(receivedRequest._id);
        return;
      }
      
      setStatus('none');
    } catch (error) {
      console.error('Error checking friend status:', error);
    }
  };

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/send-friend-request', 
        { userId: targetUser._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('pending');
      if (onStatusChange) onStatusChange('pending');
      
      // Emit socket event
      if (socket) {
        socket.emit('send-friend-request', {
          toUserId: targetUser._id,
          fromUser: user
        });
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert(error.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Find the request ID from target user
      const requestsResponse = await axios.get('/api/friend-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const request = requestsResponse.data.find(
        req => req.from === targetUser._id && req.status === 'pending'
      );
      
      if (request) {
        await axios.post('/api/accept-friend-request', 
          { requestId: request._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStatus('friends');
        if (onStatusChange) onStatusChange('friends');
        
        // Emit socket event
        if (socket) {
          socket.emit('accept-friend-request', {
            fromUserId: targetUser._id,
            toUserId: user.id
          });
        }
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert(error.response?.data?.error || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const requestsResponse = await axios.get('/api/friend-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const request = requestsResponse.data.find(
        req => req.from === targetUser._id && req.status === 'pending'
      );
      
      if (request) {
        await axios.post('/api/reject-friend-request', 
          { requestId: request._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStatus('none');
        if (onStatusChange) onStatusChange('none');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'friends':
        return {
          text: '✓ Friends',
          style: styles.friendButton,
          disabled: true,
          icon: '👥'
        };
      case 'received':
        return {
          text: 'Accept Request',
          style: styles.acceptButton,
          onClick: handleAcceptRequest,
          icon: '✅'
        };
      case 'pending':
        return {
          text: 'Request Sent',
          style: styles.pendingButton,
          onClick: handleCancelRequest,
          icon: '⏳'
        };
      default:
        return {
          text: 'Add Friend',
          style: styles.addButton,
          onClick: handleSendRequest,
          icon: '➕'
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <button
      onClick={buttonConfig.onClick}
      style={buttonConfig.style}
      disabled={buttonConfig.disabled || loading}
      className="friend-button"
    >
      {loading ? '...' : `${buttonConfig.icon} ${buttonConfig.text}`}
    </button>
  );
};

const styles = {
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  acceptButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  pendingButton: {
    padding: '8px 16px',
    backgroundColor: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  friendButton: {
    padding: '8px 16px',
    backgroundColor: '#9E9E9E',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px',
    opacity: 0.7,
    cursor: 'default'
  }
};

export default FriendButton;