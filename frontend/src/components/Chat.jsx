import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const { user, token, logout } = useAuth();

  useEffect(() => {
    // Connect to socket
    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    newSocket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("user-status", ({ userId, username, online, lastSeen }) => {
      setOnlineUsers((prev) =>
        new Map(prev).set(userId, { username, online, lastSeen }),
      );
    });

    newSocket.on("user-typing", ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    });

    setSocket(newSocket);

    // Fetch old messages
    fetchMessages();

    return () => {
      newSocket.close();
    };
  }, [token]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/messages`,
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = (content) => {
    if (socket && content.trim()) {
      socket.emit("send-message", { content });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket) {
      socket.emit("typing", { isTyping });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.userInfo}>
          <h3>{user?.username}</h3>
          <button onClick={logout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
        <div style={styles.onlineUsers}>
          <h4>Online Users</h4>
          {Array.from(onlineUsers.values()).map((user) => (
            <div key={user.username} style={styles.userItem}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: user.online ? "#4CAF50" : "#999",
                }}
              ></span>
              <span>{user.username}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.chatArea}>
        <div style={styles.chatHeader}>
          <h2>Kadalai..</h2>
          {typingUsers.size > 0 && (
            <div style={styles.typingIndicator}>
              {Array.from(typingUsers).join(", ")} is typing...
            </div>
          )}
        </div>

        <MessageList messages={messages} currentUser={user} />
        <MessageInput onSendMessage={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f0f0f0",
  },
  sidebar: {
    width: "300px",
    backgroundColor: "white",
    borderRight: "1px solid #e0e0e0",
    display: "flex",
    flexDirection: "column",
  },
  userInfo: {
    padding: "20px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
  },
  onlineUsers: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  userItem: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    margin: "5px 0",
    backgroundColor: "#f9f9f9",
    borderRadius: "5px",
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginRight: "10px",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fafafa",
  },
  chatHeader: {
    padding: "20px",
    backgroundColor: "white",
    borderBottom: "1px solid #e0e0e0",
  },
  typingIndicator: {
    fontSize: "12px",
    color: "#666",
    marginTop: "5px",
    fontStyle: "italic",
  },
};

export default Chat;
