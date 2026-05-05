import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const MenuDropdown = ({ 
  onOpenAddFriend, 
  onOpenFriendRequests, 
  onOpenSettings, 
  onOpenBlockedUsers,
  onLogout,
  unreadCount 
}) => {
  const { darkMode, toggleDarkMode, colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = (action) => {
    setIsOpen(false);
    action();
  };

  const menuItemHoverStyle = {
    transition: 'background-color 0.2s',
    cursor: 'pointer'
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{
          ...styles.menuButton,
          backgroundColor: colors.surface,
          color: colors.text,
          border: `1px solid ${colors.border}`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.surfaceLight;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.surface;
        }}
      >
        ☰
      </button>
      
      {isOpen && (
        <div style={{
          ...styles.dropdown,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 4px 12px ${darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`
        }}>
          {/* Night Mode Toggle */}
          <button
            onClick={() => handleMenuItemClick(toggleDarkMode)}
            style={{
              ...styles.menuItem,
              color: colors.text,
              borderBottom: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.menuIcon}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={styles.menuText}>
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Friend Requests */}
          <button
            onClick={() => handleMenuItemClick(onOpenFriendRequests)}
            style={{
              ...styles.menuItem,
              color: colors.text,
              borderBottom: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.menuIcon}>👥</span>
            <span style={styles.menuText}>Friend Requests</span>
            {unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount}</span>
            )}
          </button>

          {/* Add Friend */}
          <button
            onClick={() => handleMenuItemClick(onOpenAddFriend)}
            style={{
              ...styles.menuItem,
              color: colors.text,
              borderBottom: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.menuIcon}>➕</span>
            <span style={styles.menuText}>Add Friend</span>
          </button>

          {/* Blocked Users */}
          <button
            onClick={() => handleMenuItemClick(onOpenBlockedUsers)}
            style={{
              ...styles.menuItem,
              color: colors.text,
              borderBottom: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.menuIcon}>🚫</span>
            <span style={styles.menuText}>Blocked Users</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => handleMenuItemClick(onOpenSettings)}
            style={{
              ...styles.menuItem,
              color: colors.text,
              borderBottom: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.menuIcon}>⚙️</span>
            <span style={styles.menuText}>Settings</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => handleMenuItemClick(onLogout)}
            style={{
              ...styles.menuItem,
              color: '#f44336',
              marginTop: '5px',
              borderTop: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#f44336';
            }}
          >
            <span style={styles.menuIcon}>🚪</span>
            <span style={styles.menuText}>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  menuButton: {
    padding: '8px 12px',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '5px',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdown: {
    position: 'absolute',
    top: '45px',
    right: '0',
    minWidth: '200px',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  menuIcon: {
    fontSize: '18px',
    width: '24px'
  },
  menuText: {
    flex: 1,
    textAlign: 'left'
  },
  badge: {
    backgroundColor: '#f44336',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '10px',
    minWidth: '16px',
    textAlign: 'center'
  }
};

// Add keyframe animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(styleSheet);

export default MenuDropdown;