import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useTheme } from './context/ThemeContext';
import VerifyOTP from './components/VerifyOTP';
import Settings from './components/Settings';
import PrivateChat from './components/PrivateChat';
import AddFriend from './components/AddFriend';
import FriendRequests from './components/FriendRequests';
import NotificationBell from './components/NotificationBell';
import MenuDropdown from './components/MenuDropdown';
import FriendMenu from './components/FriendMenu';
import BlockedUsers from './components/BlockedUsers';
import LoadingScreen from './components/LoadingScreen';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const { colors } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeFriendMenu, setActiveFriendMenu] = useState(null);
  const [unreadRequestCount, setUnreadRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Chat states
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [friends, setFriends] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // Check screen size for mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isMobileMenuOpen && !event.target.closest('.mobile-sidebar')) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobile, isMobileMenuOpen]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Unknown';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} day ago`;
  };

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      const response = await axios.get('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  // Fetch unread friend requests count
  const fetchUnreadRequests = async () => {
    try {
      const response = await axios.get('/api/friend-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadRequestCount(response.data.length);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  // Update user data after settings change
  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    setFriends(prevFriends =>
      prevFriends.map(friend =>
        friend._id === updatedUser.id ? { ...friend, username: updatedUser.username, profilePicture: updatedUser.profilePicture } : friend
      )
    );
  };

  // Remove friend handler
  const handleRemoveFriend = (friendId) => {
    setFriends(prevFriends => prevFriends.filter(f => f._id !== friendId));
    if (selectedUser && selectedUser._id === friendId) {
      setSelectedUser(null);
    }
  };

  // Block user handler
  const handleBlockUser = (userId) => {
    setFriends(prevFriends => prevFriends.filter(f => f._id !== userId));
    if (selectedUser && selectedUser._id === userId) {
      setSelectedUser(null);
    }
  };

  // Unblock handler
  const handleUnblock = async () => {
    await fetchFriends();
  };

  // Handle unblock from chat
  const handleUnblockFromChat = async () => {
    await fetchFriends();
  };

  // Setup socket connection
  useEffect(() => {
    if (token && user) {
      fetchFriends();
      fetchUnreadRequests();
      
     // In your App.js, update the socket connection code
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const newSocket = io(SOCKET_URL, {
  auth: { token },
  transports: ['polling'], // Use only polling instead of websocket
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

      newSocket.on('connect', () => {
        console.log('✅ Socket connected');
      });

      newSocket.on('online-users-update', (onlineUsersList) => {
        setFriends(prevFriends => {
          return prevFriends.map(friend => {
            const isOnline = onlineUsersList.some(u => u.userId === friend._id);
            return { ...friend, online: isOnline };
          });
        });
      });

      newSocket.on('friend-request-received', () => {
        fetchUnreadRequests();
      });
      
      newSocket.on('friend-request-accepted', () => {
        fetchFriends();
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, user]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/register', { 
        email, 
        username, 
        password 
      });
      
      if (response.data.requiresOTP) {
        setPendingEmail(email);
        setShowOTPVerification(true);
      }
      
      alert(response.data.message || 'Registration successful! Please verify your email.');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/login', { 
        email, 
        password 
      });
      
      if (response.data.requiresOTP) {
        setPendingEmail(email);
        setShowOTPVerification(true);
        alert('Please verify your email first. OTP sent to your email.');
      } else {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    }
  };

  const handleOTPSuccess = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setShowOTPVerification(false);
    setPendingEmail('');
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    setToken(null);
    setUser(null);
    setMessages([]);
    setFriends([]);
    setShowSettings(false);
    setShowAddFriend(false);
    setShowFriendRequests(false);
    setShowBlockedUsers(false);
    setSelectedUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showOTPVerification) {
    return (
      <VerifyOTP 
        email={pendingEmail}
        onVerificationSuccess={handleOTPSuccess}
        onBack={() => {
          setShowOTPVerification(false);
          setPendingEmail('');
        }}
      />
    );
  }

  if (token && user) {
    const onlineCount = friends.filter(f => f.online).length;
    
    // Updated mobile responsive styles
    const mobileStyles = {
      container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: colors.background,
        position: 'relative'
      },
      sidebar: {
        position: 'fixed',
        top: 0,
        left: isMobileMenuOpen ? 0 : '-85%',
        width: '85%',
        maxWidth: '300px',
        height: '100%',
        backgroundColor: colors.surface,
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        transition: 'left 0.3s ease-in-out',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column'
      },
      mobileHeader: {
        display: 'flex',
        padding: '12px 15px',
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10
      },
      menuButton: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: colors.text,
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      overlay: {
        display: isMobileMenuOpen ? 'block' : 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000
      },
      chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background,
        width: '100%'
      },
      chatHeader: {
        padding: '12px 15px',
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      },
      backButton: {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: colors.text,
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    };

    // Desktop styles
    const desktopStyles = {
      container: {
        display: 'flex',
        height: '100vh',
        backgroundColor: colors.background
      },
      sidebar: {
        width: '340px',
        backgroundColor: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column'
      },
      chatArea: {
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
        alignItems: 'center',
        gap: '15px'
      }
    };

    const currentStyles = isMobile ? mobileStyles : desktopStyles;

    return (
      <>
        {isMobile && (
          <>
            {isMobileMenuOpen && <div style={mobileStyles.overlay} onClick={() => setIsMobileMenuOpen(false)} />}
            <div style={mobileStyles.mobileHeader}>
              <button style={mobileStyles.menuButton} onClick={() => setIsMobileMenuOpen(true)}>
                ☰
              </button>
              <div style={styles.headerLogo}>
                <img src="/logo-32x32.png" alt="Uraiyadal" style={styles.headerLogoImage} />
              </div>
              <div style={{ width: '40px' }} />
            </div>
          </>
        )}
        
        <div style={currentStyles.container}>
          {/* Sidebar */}
          <div style={currentStyles.sidebar} className="mobile-sidebar">
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                <div style={styles.headerLogo}>
                  <img src="/logo-32x32.png" alt="Uraiyadal" style={styles.headerLogoImage} />
                </div>
                {user.profilePicture ? (
                  <img 
                    src={`http://localhost:5000${user.profilePicture}`} 
                    alt={user.username}
                    style={styles.avatarImage}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 style={{ color: colors.text, fontSize: isMobile ? '14px' : '16px' }}>{user.username}</h3>
              </div>
              <div style={styles.userActions}>
                <NotificationBell socket={socket} />
                <MenuDropdown 
                  onOpenAddFriend={() => setShowAddFriend(true)}
                  onOpenFriendRequests={() => setShowFriendRequests(true)}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenBlockedUsers={() => setShowBlockedUsers(true)}
                  onLogout={handleLogout}
                  unreadCount={unreadRequestCount}
                />
              </div>
            </div>
            
            {/* Friends List */}
            <div style={styles.friendsList}>
              <h4 style={{ color: colors.text, fontSize: isMobile ? '12px' : '14px' }}>
                Friends ({friends.length}) 🟢 {onlineCount} online
              </h4>
              {friends.length === 0 ? (
                <div style={styles.noFriends}>
                  <p style={{ color: colors.textLighter }}>No friends yet</p>
                  <p style={styles.noFriendsSub}>Click the menu (☰) to add friends</p>
                </div>
              ) : (
                friends.map(friend => (
                  <div 
                    key={friend._id} 
                    style={{
                      ...styles.friendItem,
                      padding: isMobile ? '10px' : '12px',
                      ...(selectedUser?._id === friend._id ? styles.selectedFriend : {})
                    }}
                    onClick={() => {
                      setSelectedUser(friend);
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                  >
                    {friend.profilePicture ? (
                      <img 
                        src={`http://localhost:5000${friend.profilePicture}`}
                        alt={friend.username}
                        style={{...styles.friendAvatar, width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px'}}
                      />
                    ) : (
                      <div style={{...styles.friendAvatarPlaceholder, width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px'}}>
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={styles.friendInfo}>
                      <div>
                        <div style={{ color: colors.text, fontSize: isMobile ? '14px' : '16px', fontWeight: '600' }}>
                          {friend.username}
                        </div>
                        {!isMobile && <div style={{ color: colors.textLighter, fontSize: '11px', marginTop: '2px' }}>{friend.email}</div>}
                        <div style={{ fontSize: isMobile ? '10px' : '11px', marginTop: '4px' }}>
                          {friend.online ? (
                            <span style={{ color: colors.success }}>● Online</span>
                          ) : (
                            <span style={{ color: colors.textLighter }}>● {formatLastSeen(friend.lastSeen)}</span>
                          )}
                        </div>
                      </div>
                      {friend.online && <span style={styles.onlineDot}></span>}
                    </div>
                    <button 
                      style={styles.menuButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFriendMenu(activeFriendMenu === friend._id ? null : friend._id);
                      }}
                    >
                      ⋮
                    </button>
                    {activeFriendMenu === friend._id && (
                      <FriendMenu 
                        friend={friend}
                        onClose={() => setActiveFriendMenu(null)}
                        onRemoveFriend={handleRemoveFriend}
                        onBlockUser={handleBlockUser}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div style={currentStyles.chatArea}>
            <div style={currentStyles.chatHeader}>
              {selectedUser && isMobile && (
                <button style={mobileStyles.backButton} onClick={() => setSelectedUser(null)}>
                  ←
                </button>
              )}
              <div style={styles.welcomeLogo}>
                <img src="/logo-48x48.png" alt="Uraiyadal" style={{...styles.welcomeLogoImage, width: isMobile ? '32px' : '48px', height: isMobile ? '32px' : '48px'}} />
              </div>
              <div style={{ flex: 1 }}>
                {selectedUser ? (
                  <>
                    <h2 style={{ color: colors.text, fontSize: isMobile ? '16px' : '24px', margin: 0 }}>
                      {selectedUser.username}
                    </h2>
                    <p style={{ color: colors.textLight, fontSize: isMobile ? '10px' : '12px', margin: '4px 0 0 0' }}>
                      {selectedUser.online ? '● Online' : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{ color: colors.text, fontSize: isMobile ? '18px' : '24px', margin: 0 }}>Uraiyadal</h2>
                    <p style={{ color: colors.textLight, fontSize: isMobile ? '11px' : '14px', margin: '4px 0 0 0' }}>
                      Select a friend to start chatting
                    </p>
                  </>
                )}
              </div>
            </div>
            
            {selectedUser ? (
              <PrivateChat 
                user={user}
                selectedUser={selectedUser}
                socket={socket}
                onClose={() => setSelectedUser(null)}
                onUnblock={handleUnblockFromChat}
              />
            ) : (
              <div style={styles.noChatSelected}>
                <div style={{ textAlign: 'center', color: colors.textLighter, padding: '20px' }}>
                  <p>👋 Welcome, {user.username}!</p>
                  <p>Tap the menu (☰) to add friends</p>
                  <p>Select a friend to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Modals */}
        {showSettings && (
          <Settings 
            user={user}
            onUpdate={handleUpdateUser}
            onClose={() => setShowSettings(false)}
            onLogout={handleLogout}
          />
        )}
        
        {showAddFriend && (
          <AddFriend 
            onClose={() => setShowAddFriend(false)}
            onFriendAdded={() => {
              setShowAddFriend(false);
              fetchFriends();
            }}
            user={user}
            socket={socket}
          />
        )}
        
        {showFriendRequests && (
          <FriendRequests 
            onClose={() => setShowFriendRequests(false)}
            onRequestHandled={() => {
              setShowFriendRequests(false);
              fetchFriends();
              fetchUnreadRequests();
            }}
            user={user}
            socket={socket}
          />
        )}

        {showBlockedUsers && (
          <BlockedUsers 
            onClose={() => setShowBlockedUsers(false)}
            onUnblock={handleUnblock}
          />
        )}
      </>
    );
  }

  // Login/Register styles
  const loginStyles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    },
    card: {
      backgroundColor: colors.surface,
      padding: window.innerWidth <= 480 ? '25px' : '35px',
      borderRadius: '15px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: window.innerWidth <= 480 ? '90%' : '400px'
    },
    title: {
      textAlign: 'center',
      marginBottom: window.innerWidth <= 480 ? '20px' : '25px',
      marginTop: '5px',
      color: colors.text,
      fontSize: window.innerWidth <= 480 ? '22px' : '26px',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={styles.loginLogo}>
          <img src="/logo-64x64.png" alt="Uraiyadal" style={{...styles.loginLogoImage, width: window.innerWidth <= 480 ? '70px' : '90px', height: window.innerWidth <= 480 ? '70px' : '90px'}} />
        </div>
        <h1 style={loginStyles.title}>Uraiyadal</h1>
        
        <div style={styles.toggleButtons}>
          <button 
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            style={{
              ...styles.toggleButton,
              ...(isLogin ? { ...styles.activeToggle, backgroundColor: colors.primary, color: 'white' } : { backgroundColor: colors.surfaceLight, color: colors.text })
            }}
          >
            Login
          </button>
          <button 
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            style={{
              ...styles.toggleButton,
              ...(!isLogin ? { ...styles.activeToggle, backgroundColor: colors.primary, color: 'white' } : { backgroundColor: colors.surfaceLight, color: colors.text })
            }}
          >
            Register
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {isLogin ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
                fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                padding: window.innerWidth <= 480 ? '12px' : '14px'
              }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
                fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                padding: window.innerWidth <= 480 ? '12px' : '14px'
              }}
              required
            />
            <button type="submit" style={{ ...styles.button, backgroundColor: colors.primary, fontSize: window.innerWidth <= 480 ? '15px' : '16px', padding: window.innerWidth <= 480 ? '12px' : '14px' }}>
              Login 🔐
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
                fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                padding: window.innerWidth <= 480 ? '12px' : '14px'
              }}
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
                fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                padding: window.innerWidth <= 480 ? '12px' : '14px'
              }}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
                fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                padding: window.innerWidth <= 480 ? '12px' : '14px'
              }}
              required
              minLength="6"
            />
            <button type="submit" style={{ ...styles.button, backgroundColor: colors.primary, fontSize: window.innerWidth <= 480 ? '15px' : '16px', padding: window.innerWidth <= 480 ? '12px' : '14px' }}>
              Register ✨
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  toggleButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '25px'
  },
  toggleButton: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  activeToggle: {
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  button: {
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '15px',
    textAlign: 'center',
    fontSize: '14px'
  },
  userAvatar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  userActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  avatarImage: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  avatarPlaceholder: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  friendsList: {
    flex: 1,
    padding: '15px',
    overflowY: 'auto'
  },
  friendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '8px 0',
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative'
  },
  friendInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  friendAvatar: {
    borderRadius: '50%',
    objectFit: 'cover'
  },
  friendAvatarPlaceholder: {
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  selectedFriend: {
    backgroundColor: '#e3f2fd',
    borderLeft: '3px solid #667eea'
  },
  onlineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    display: 'inline-block',
    animation: 'pulse 1.5s infinite'
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#999',
    padding: '8px',
    borderRadius: '8px',
    zIndex: 10
  },
  noFriends: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  noFriendsSub: {
    fontSize: '12px',
    marginTop: '10px',
    color: '#999'
  },
  noChatSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Logo styles
  headerLogo: {
    marginRight: '5px'
  },
  headerLogoImage: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    objectFit: 'contain'
  },
  loginLogo: {
    textAlign: 'center',
    marginTop: '-10px',
    marginBottom: '5px'
  },
  loginLogoImage: {
    borderRadius: '20px',
    objectFit: 'contain'
  },
  welcomeLogo: {
    marginRight: '10px'
  },
  welcomeLogoImage: {
    borderRadius: '12px',
    objectFit: 'contain'
  },
  userInfo: {
    padding: '15px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
};

export default App;