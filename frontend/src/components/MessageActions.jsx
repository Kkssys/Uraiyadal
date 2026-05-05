import React, { useState } from 'react';
import axios from 'axios';

const MessageActions = ({ message, currentUser, onDelete, onClose }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDeleteForMe = async () => {
    if (window.confirm('Delete this message for yourself only?')) {
      setDeleting(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/delete-message-for-me/${message._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onDelete(message._id, 'me');
        onClose();
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message');
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleDeleteForEveryone = async () => {
    if (window.confirm('Delete this message for everyone? This cannot be undone.')) {
      setDeleting(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/delete-message-for-everyone/${message._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onDelete(message._id, 'everyone');
        onClose();
      } catch (error) {
        console.error('Error deleting message for everyone:', error);
        alert('Failed to delete message');
      } finally {
        setDeleting(false);
      }
    }
  };

  const isSender = message.from === currentUser.id;

  return (
    <div style={styles.menu}>
      <button 
        onClick={handleDeleteForMe} 
        style={styles.menuItem}
        disabled={deleting}
      >
        🗑️ Delete for me
      </button>
      {isSender && (
        <button 
          onClick={handleDeleteForEveryone} 
          style={{...styles.menuItem, ...styles.dangerItem}}
          disabled={deleting}
        >
          ⚠️ Delete for everyone
        </button>
      )}
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
    minWidth: '150px',
    overflow: 'hidden'
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

export default MessageActions;