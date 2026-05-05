import React, { useState, useRef } from 'react';
import axios from 'axios';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Settings = ({ user, onUpdate, onClose, onLogout }) => {
  const { colors, darkMode, toggleDarkMode } = useTheme();
  const [newUsername, setNewUsername] = useState(user.username);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const getToken = () => localStorage.getItem('token');

  const getAuthConfig = () => ({
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    setUsernameError('');
    setUsernameSuccess('');
    setIsUpdatingUsername(true);
    
    try {
      const response = await axios.put('/api/update-username', 
        { newUsername: newUsername },
        getAuthConfig()
      );
      
      setUsernameSuccess('Username updated successfully!');
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      
      onUpdate(response.data.user);
      
      setTimeout(() => setUsernameSuccess(''), 3000);
    } catch (error) {
      console.error('Update error:', error.response?.data);
      setUsernameError(error.response?.data?.error || 'Failed to update username');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match(/image.*/)) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    setUploadingImage(true);
    
    try {
      const response = await axios.post('/api/upload-profile-picture', 
        formData,
        {
          ...getAuthConfig(),
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      onUpdate(response.data.user);
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Upload error:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      try {
        const response = await axios.delete('/api/remove-profile-picture', getAuthConfig());
        onUpdate(response.data.user);
        alert('Profile picture removed successfully');
      } catch (error) {
        console.error('Remove error:', error.response?.data);
        alert('Failed to remove profile picture');
      }
    }
  };

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
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
      maxHeight: '90vh',
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
    section: {
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: `1px solid ${colors.border}`
    },
    sectionTitle: {
      marginBottom: '15px',
      color: colors.text
    },
    profilePictureSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap'
    },
    profilePictureContainer: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      overflow: 'hidden',
      backgroundColor: colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    profilePicture: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    profilePlaceholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      color: 'white'
    },
    label: {
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: '5px',
      display: 'block'
    },
    input: {
      padding: '10px',
      fontSize: '14px',
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: '5px',
      outline: 'none',
      width: '100%',
      backgroundColor: colors.inputBackground,
      color: colors.text
    },
    disabledInput: {
      padding: '10px',
      fontSize: '14px',
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: '5px',
      backgroundColor: colors.surfaceLight,
      color: colors.textLighter,
      width: '100%'
    },
    primaryButton: {
      padding: '10px 20px',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    dangerButton: {
      padding: '10px 20px',
      backgroundColor: colors.error,
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    logoutButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: colors.error,
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    error: {
      color: colors.error,
      fontSize: '12px',
      padding: '5px'
    },
    success: {
      color: colors.success,
      fontSize: '12px',
      padding: '5px'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: `1px solid ${colors.border}`,
      color: colors.text
    },
    infoLabel: {
      fontWeight: 'bold',
      color: colors.textLight
    },
    infoValue: {
      color: colors.text
    },
    themeToggleRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0'
    },
    themeToggleText: {
      color: colors.text
    }
  };

  return (
    <div style={dynamicStyles.overlay}>
      <div style={dynamicStyles.modal}>
        <div style={dynamicStyles.header}>
          <h2>Settings</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        <div style={dynamicStyles.content}>
          {/* Profile Picture Section */}
          <div style={dynamicStyles.section}>
            <h3 style={dynamicStyles.sectionTitle}>Profile Picture</h3>
            <div style={dynamicStyles.profilePictureSection}>
              <div style={dynamicStyles.profilePictureContainer}>
                {user.profilePicture ? (
                  <img 
                    src={`https://uraiyadal-o842.onrender.com${user.profilePicture}`}
                    alt={user.username}
                    style={dynamicStyles.profilePicture}
                  />
                ) : (
                  <div style={dynamicStyles.profilePlaceholder}>
                    {getInitials(user.username)}
                  </div>
                )}
              </div>
              <div style={styles.profilePictureButtons}>
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  style={dynamicStyles.primaryButton}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Picture'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {user.profilePicture && (
                  <button 
                    onClick={handleRemoveProfilePicture} 
                    style={dynamicStyles.dangerButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Theme Section */}
          <div style={dynamicStyles.section}>
            <h3 style={dynamicStyles.sectionTitle}>Appearance</h3>
            <div style={dynamicStyles.themeToggleRow}>
              <span style={dynamicStyles.themeToggleText}>
                {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </span>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Username Section */}
          <div style={dynamicStyles.section}>
            <h3 style={dynamicStyles.sectionTitle}>Change Username</h3>
            <form onSubmit={handleUpdateUsername} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={dynamicStyles.label}>Current Username:</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  style={dynamicStyles.disabledInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={dynamicStyles.label}>New Username:</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={dynamicStyles.input}
                  placeholder="Enter new username"
                  required
                />
              </div>
              {usernameError && <div style={dynamicStyles.error}>{usernameError}</div>}
              {usernameSuccess && <div style={dynamicStyles.success}>{usernameSuccess}</div>}
              <button 
                type="submit" 
                style={dynamicStyles.primaryButton}
                disabled={isUpdatingUsername || newUsername === user.username}
              >
                {isUpdatingUsername ? 'Updating...' : 'Update Username'}
              </button>
            </form>
          </div>
          
          {/* Account Info Section */}
          <div style={dynamicStyles.section}>
            <h3 style={dynamicStyles.sectionTitle}>Account Information</h3>
            <div style={dynamicStyles.infoRow}>
              <span style={dynamicStyles.infoLabel}>Email:</span>
              <span style={dynamicStyles.infoValue}>{user.email}</span>
            </div>
            <div style={dynamicStyles.infoRow}>
              <span style={dynamicStyles.infoLabel}>Member since:</span>
              <span style={dynamicStyles.infoValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={dynamicStyles.infoRow}>
              <span style={dynamicStyles.infoLabel}>Verified:</span>
              <span style={dynamicStyles.infoValue}>
                {user.isVerified ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>
          
          {/* Logout Section */}
          <div style={dynamicStyles.section}>
            <button onClick={onLogout} style={dynamicStyles.logoutButton}>
              Logout
            </button>
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
  profilePictureButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  }
};

export default Settings;