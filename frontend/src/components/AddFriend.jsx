import React, { useState } from 'react';
import axios from 'axios';
import UnifiedFriendButton from './UnifiedFriendButton';
import { useTheme } from '../context/ThemeContext';

const AddFriend = ({ onClose, onFriendAdded, user, socket }) => {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (searchTerm.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }
    
    setSearching(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/search-new-users?search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError('No users found');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleFriendStatusChange = (userId, newStatus) => {
    if (newStatus === 'friends') {
      setSearchResults(prev => prev.filter(u => u._id !== userId));
      onFriendAdded();
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
      maxWidth: '500px',
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
    searchSection: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    searchInput: {
      flex: 1,
      padding: '12px',
      fontSize: '14px',
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: '5px',
      outline: 'none',
      backgroundColor: colors.inputBackground,
      color: colors.text
    },
    searchButton: {
      padding: '12px 24px',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer'
    },
    error: {
      backgroundColor: colors.error + '20',
      color: colors.error,
      padding: '10px',
      borderRadius: '5px',
      marginBottom: '15px',
      textAlign: 'center'
    },
    resultItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '15px',
      backgroundColor: colors.surfaceLight,
      borderRadius: '8px',
      marginBottom: '10px'
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
    userDetails: {
      flex: 1
    },
    userName: {
      fontSize: '16px',
      fontWeight: '600',
      color: colors.text
    },
    userEmail: {
      fontSize: '12px',
      color: colors.textLighter,
      marginTop: '2px'
    },
    userStatus: {
      fontSize: '11px',
      marginTop: '4px',
      color: colors.textLight
    }
  };

  return (
    <div style={dynamicStyles.overlay}>
      <div style={dynamicStyles.modal}>
        <div style={dynamicStyles.header}>
          <h2>Add New Friend</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        <div style={dynamicStyles.content}>
          <div style={dynamicStyles.searchSection}>
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={dynamicStyles.searchInput}
            />
            <button onClick={handleSearch} style={dynamicStyles.searchButton} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {error && <div style={dynamicStyles.error}>{error}</div>}
          
          <div style={styles.results}>
            {searchResults.map(user => (
              <div key={user._id} style={dynamicStyles.resultItem}>
                {user.profilePicture ? (
                  <img 
                    src={`http://localhost:5000${user.profilePicture}`}
                    alt={user.username}
                    style={dynamicStyles.avatar}
                  />
                ) : (
                  <div style={dynamicStyles.avatarPlaceholder}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={dynamicStyles.userDetails}>
                  <div style={dynamicStyles.userName}>{user.username}</div>
                  <div style={dynamicStyles.userEmail}>{user.email}</div>
                  <div style={dynamicStyles.userStatus}>
                    {user.online ? '🟢 Online' : '⚫ Offline'}
                  </div>
                </div>
                <UnifiedFriendButton 
                  user={user}
                  targetUser={user}
                  onStatusChange={(newStatus) => handleFriendStatusChange(user._id, newStatus)}
                  socket={socket}
                />
              </div>
            ))}
          </div>
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
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }
};

export default AddFriend;