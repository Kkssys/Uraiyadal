import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const UnifiedFriendButton = ({ user, targetUser, onStatusChange, socket }) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState('none');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    checkFriendStatus();
  }, [targetUser]);

  useEffect(() => {
    if (socket) {
      socket.on('friend-request-received', ({ fromUserId }) => {
        if (fromUserId === targetUser._id) {
          setStatus('received');
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
        return;
      }
      
      // Check if target sent request to user
      const receivedRequest = requestsResponse.data.find(
        req => req.from === targetUser._id
      );
      if (receivedRequest && receivedRequest.status === 'pending') {
        setStatus('received');
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
      
      if (socket) {
        socket.emit('send-friend-request', {
          toUserId: targetUser._id,
          fromUser: { id: user.id, username: user.username }
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

  const handleRemoveFriend = async () => {
    if (window.confirm(`Are you sure you want to remove ${targetUser.username} from your friends?`)) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/remove-friend/${targetUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus('none');
        if (onStatusChange) onStatusChange('none');
      } catch (error) {
        console.error('Error removing friend:', error);
        alert('Failed to remove friend');
      } finally {
        setLoading(false);
        setShowDropdown(false);
      }
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'friends':
        return {
          text: 'Friends ✓',
          style: { ...styles.friendButton, backgroundColor: colors.success },
          icon: '👥',
          showDropdown: true,
          onClick: () => setShowDropdown(!showDropdown)
        };
      case 'received':
        return {
          text: 'Accept Request',
          style: { ...styles.acceptButton, backgroundColor: colors.primary },
          icon: '✅',
          onClick: handleAcceptRequest
        };
      case 'pending':
        return {
          text: 'Request Sent',
          style: { ...styles.pendingButton, backgroundColor: colors.warning },
          icon: '⏳',
          onClick: handleCancelRequest
        };
      default:
        return {
          text: 'Add Friend',
          style: { ...styles.addButton, backgroundColor: colors.success },
          icon: '➕',
          onClick: handleSendRequest
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div style={styles.container}>
      <button
        onClick={buttonConfig.onClick}
        style={buttonConfig.style}
        disabled={loading}
        className="friend-button"
      >
        {loading ? '...' : `${buttonConfig.icon} ${buttonConfig.text}`}
      </button>
      
      {buttonConfig.showDropdown && showDropdown && (
        <div style={styles.dropdown}>
          <button onClick={handleRemoveFriend} style={styles.dropdownItem}>
            🗑️ Remove Friend
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative'
  },
  addButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  acceptButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  pendingButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  friendButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '5px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: 100,
    minWidth: '150px'
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 15px',
    textAlign: 'left',
    border: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#f44336',
    borderRadius: '5px',
    transition: 'background-color 0.2s'
  }
};

export default UnifiedFriendButton;