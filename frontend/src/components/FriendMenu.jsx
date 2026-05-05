import React, { useState } from 'react';
import axios from 'axios';

const FriendMenu = ({ friend, onClose, onRemoveFriend, onBlockUser }) => {
  const [loading, setLoading] = useState(false);

  const handleRemoveFriend = async () => {
    if (window.confirm(`Are you sure you want to remove ${friend.username} from your friends?`)) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/remove-friend/${friend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onRemoveFriend(friend._id);
        onClose();
        alert(`${friend.username} removed from friends`);
      } catch (error) {
        console.error('Error removing friend:', error);
        alert('Failed to remove friend');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBlockUser = async () => {
    if (window.confirm(`Are you sure you want to block ${friend.username}? You will no longer see their messages and they won't be able to contact you.`)) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`/api/block-user/${friend._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Block response:', response.data);
        onBlockUser(friend._id);
        onClose();
        alert(`${friend.username} has been blocked`);
      } catch (error) {
        console.error('Error blocking user:', error.response?.data || error);
        alert(error.response?.data?.error || 'Failed to block user');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={styles.menu}>
      <button onClick={handleRemoveFriend} style={styles.menuItem} disabled={loading}>
        🗑️ Remove Friend
      </button>
      <button onClick={handleBlockUser} style={{...styles.menuItem, ...styles.dangerItem}} disabled={loading}>
        🚫 Block User
      </button>
    </div>
  );
};

const styles = {
  menu: {
    position: 'absolute',
    top: '100%',
    right: '0',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 100,
    minWidth: '160px',
    overflow: 'hidden',
    marginTop: '5px'
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 15px',
    textAlign: 'left',
    border: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  dangerItem: {
    color: '#f44336',
    borderTop: '1px solid #e0e0e0'
  }
};

export default FriendMenu;