import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UnifiedFriendButton from './UnifiedFriendButton';
import { useTheme } from '../context/ThemeContext';

const FriendRequests = ({ onClose, onRequestHandled, user, socket }) => {
  const { colors } = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    if (socket) {
      socket.on('friend-request-received', () => {
        fetchRequests();
      });
      
      return () => {
        socket.off('friend-request-received');
      };
    }
  }, [socket]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/friend-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendStatusChange = (userId, newStatus) => {
    if (newStatus === 'friends') {
      setRequests(prev => prev.filter(r => r.from !== userId));
      onRequestHandled();
    }
  };

  const dynamicStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: '10px',
      width: '90%',
      maxWidth: '450px',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderBottom: `1px solid ${colors.border}`,
      color: colors.text
    },
    content: {
      padding: '20px',
      flex: 1,
      overflowY: 'auto'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: colors.textLighter
    },
    noRequests: {
      textAlign: 'center',
      padding: '40px',
      color: colors.textLighter
    },
    requestItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '15px',
      margin: '10px 0',
      backgroundColor: colors.surfaceLight,
      borderRadius: '10px'
    },
    avatar: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    avatarPlaceholder: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      backgroundColor: colors.primary,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: 'bold'
    },
    requestDetails: {
      flex: 1
    },
    username: {
      fontSize: '16px',
      fontWeight: '600',
      color: colors.text
    },
    time: {
      fontSize: '11px',
      color: colors.textLighter,
      marginTop: '4px'
    }
  };

  return (
    <div style={dynamicStyles.overlay}>
      <div style={dynamicStyles.modal}>
        <div style={dynamicStyles.header}>
          <h2>Friend Requests</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        <div style={dynamicStyles.content}>
          {loading ? (
            <div style={dynamicStyles.loading}>Loading...</div>
          ) : requests.length === 0 ? (
            <div style={dynamicStyles.noRequests}>No pending friend requests</div>
          ) : (
            requests.map(request => (
              <div key={request._id} style={dynamicStyles.requestItem}>
                {request.fromProfilePicture ? (
                  <img 
                    src={`http://localhost:5000${request.fromProfilePicture}`}
                    alt={request.fromUsername}
                    style={dynamicStyles.avatar}
                  />
                ) : (
                  <div style={dynamicStyles.avatarPlaceholder}>
                    {request.fromUsername?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={dynamicStyles.requestDetails}>
                  <div style={dynamicStyles.username}>{request.fromUsername}</div>
                  <div style={dynamicStyles.time}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <UnifiedFriendButton 
                  targetUser={{ _id: request.from, username: request.fromUsername }}
                  user={user}
                  onStatusChange={(newStatus) => handleFriendStatusChange(request.from, newStatus)}
                  socket={socket}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999'
  }
};

export default FriendRequests;