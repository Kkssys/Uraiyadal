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
  
  // Chat states
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [friends, setFriends] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // Simulate loading or wait for auth check
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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

  // Setup socket connection when user logs in
  useEffect(() => {
    if (token && user) {
      fetchFriends();
      fetchUnreadRequests();
      
      const newSocket = io('https://uraiyadal-o842.onrender.com' || 'http://localhost:5000', {
        auth: { token },
        transports: ['polling', 'websocket']
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

  // Show loading screen while checking auth
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
    
    const dynamicStyles = {
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
      userInfo: {
        padding: '20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      },
      friendsList: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      },
      friendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        margin: '8px 0',
        backgroundColor: colors.surfaceLight,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative'
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

    return (
      <div style={dynamicStyles.container}>
        {/* Sidebar */}
        <div style={dynamicStyles.sidebar}>
          <div style={dynamicStyles.userInfo}>
            <div style={styles.userAvatar}>
              <div style={styles.headerLogo}>
                <img src="/logo-64x64.png" alt="Uraiyadal" style={styles.headerLogoImage} />
              </div>
              {user.profilePicture ? (
                <img 
                  src={`https://uraiyadal-o842.onrender.com${user.profilePicture}`} 
                  alt={user.username}
                  style={styles.avatarImage}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 style={{ color: colors.text }}>{user.username}</h3>
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
          <div style={dynamicStyles.friendsList}>
            <h4 style={{ color: colors.text }}>Friends ({friends.length}) 🟢 {onlineCount} online</h4>
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
                    ...dynamicStyles.friendItem,
                    ...(selectedUser?._id === friend._id ? styles.selectedFriend : {})
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setSelectedUser(friend)}>
                    {friend.profilePicture ? (
                      <img 
                        src={`https://uraiyadal-o842.onrender.com${friend.profilePicture}`}
                        alt={friend.username}
                        style={styles.friendAvatar}
                      />
                    ) : (
                      <div style={styles.friendAvatarPlaceholder}>
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={styles.friendInfo}>
                      <div>
                        <div style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>{friend.username}</div>
                        <div style={{ color: colors.textLighter, fontSize: '11px', marginTop: '2px' }}>{friend.email}</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          {friend.online ? (
                            <span style={{ color: colors.success }}>🟢 Online</span>
                          ) : (
                            <span style={{ color: colors.textLighter }}>⚫ Last seen {formatLastSeen(friend.lastSeen)}</span>
                          )}
                        </div>
                      </div>
                      {friend.online && <span style={styles.onlineDot}></span>}
                    </div>
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
        {selectedUser ? (
          <PrivateChat 
            user={user}
            selectedUser={selectedUser}
            socket={socket}
            onClose={() => setSelectedUser(null)}
            onUnblock={handleUnblockFromChat}
          />
        ) : (
          <div style={dynamicStyles.chatArea}>
            <div style={dynamicStyles.chatHeader}>
              <div style={styles.welcomeLogo}>
                <img src="/favicon-96x96.png" alt="Uraiyadal" style={styles.welcomeLogoImage} />
              </div>
              <div>
                <h2 style={{ color: colors.text }}>Uraiyadal</h2>
                <p style={{ color: colors.textLight }}>Select a friend to start chatting</p>
              </div>
            </div>
            <div style={styles.noChatSelected}>
              <div style={{ textAlign: 'center', color: colors.textLighter }}>
                <p>👋 Welcome, {user.username} to Uraiyadal!!</p>
                {/* <p>Click the menu (☰) to add friends</p>
                <p>Once added, select a friend to start chatting</p> */}
              </div>
            </div>
          </div>
        )}
        
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
      </div>
    );
  }

  const loginStyles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      padding: '20px',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    },
    card: {
      backgroundColor: colors.surface,
      padding: '40px',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px'
    },
    title: {
      textAlign: 'center',
      marginBottom: '30px',
      color: colors.text
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={styles.loginLogo}>
          <img src="/favicon-192x192.png" alt="Uraiyadal" style={styles.loginLogoImage} />
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
                color: colors.text
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
                color: colors.text
              }}
              required
            />
            <button type="submit" style={{ ...styles.button, backgroundColor: colors.primary }}>
              Login 
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
                color: colors.text
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
                color: colors.text
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
                color: colors.text
              }}
              required
              minLength="6"
            />
            <button type="submit" style={{ ...styles.button, backgroundColor: colors.primary }}>
              Register 
            </button>
          </form>
        )}
{/*         
        <div style={{ ...styles.infoText, color: colors.textLighter }}>
          <p>🔐 Secure OTP verification</p>
          <p>💬 Real-time private messaging</p>
          <p>👥 Send friend requests to chat</p>
          <p>🚫 Block unwanted users</p>
          <p>🔔 Real-time notifications</p>
          <p>🌙 Dark mode support</p>
        </div> */}
      </div>
    </div>
  );
}

const styles = {
  toggleButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  toggleButton: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s'
  },
  activeToggle: {
    color: 'white'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid',
    borderRadius: '5px',
    outline: 'none',
    transition: 'all 0.3s'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '15px',
    textAlign: 'center'
  },
  infoText: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    lineHeight: '1.8'
  },
  userAvatar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
  noFriends: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  noFriendsSub: {
    fontSize: '12px',
    marginTop: '10px',
    color: '#999'
  },
  selectedFriend: {
    backgroundColor: '#e3f2fd',
    borderLeft: '3px solid #667eea'
  },
  friendAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  friendAvatarPlaceholder: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  friendInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    borderRadius: '5px',
    zIndex: 10
  },
  noChatSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Logo styles with proper ratios
  // headerLogo: {
  //   marginRight: '5px'
  // },
  headerLogoImage: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    objectFit: 'contain'
  },
  loginLogo: {
    textAlign: 'center',
    // marginBottom: '20px'
  },
  loginLogoImage: {
    width: '200px',
    height: '200px',
    borderRadius: '16px',
    objectFit: 'contain'
  },
  welcomeLogo: {
    marginRight: '1px'
  },
  welcomeLogoImage: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    // 
  }
};

export default App;