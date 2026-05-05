import React, { useState, useEffect } from "react";
import axios from "axios";

const NotificationBell = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on("new-notification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socket.on("friend-request-accepted", (data) => {
        fetchNotifications();
      });
    }

    return () => {
      if (socket) {
        socket.off("new-notification");
        socket.off("friend-request-accepted");
      }
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/mark-notification-read/${notificationId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "/api/mark-all-notifications-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "friend_request":
        return "👋";
      case "friend_accept":
        return "✅";
      case "message":
        return "💬";
      default:
        return "🔔";
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={styles.bellButton}
      >
        🔔 {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAllButton}>
                Mark all as read
              </button>
            )}
          </div>
          <div style={styles.notificationList}>
            {notifications.length === 0 ? (
              <div style={styles.noNotifications}>No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    ...styles.notificationItem,
                    backgroundColor: notification.read ? "#f9f9f9" : "#e3f2fd",
                  }}
                  onClick={() => markAsRead(notification._id)}
                >
                  <div style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div style={styles.notificationTime}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!notification.read && <div style={styles.unreadDot}></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
  },
  bellButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    position: "relative",
    padding: "8px",
  },
  badge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#f44336",
    color: "white",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
    minWidth: "18px",
  },
  dropdown: {
    position: "absolute",
    top: "45px",
    right: "-150px",
    width: "330px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    zIndex: 1000,
    border: "1px solid #211f1f",
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    borderBottom: "1px solid #f7eeee",
  },
  markAllButton: {
    background: "none",
    border: "none",
    color: "#667eea",
    cursor: "pointer",
    fontSize: "12px",
  },
  notificationList: {
    maxHeight: "400px",
    overflowY: "auto",
  },
  noNotifications: {
    padding: "40px",
    textAlign: "center",
    color: "#999",
  },
  notificationItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 15px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    position: "relative",
  },
  notificationIcon: {
    fontSize: "24px",
    minWidth: "40px",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: "14px",
    color: "#333",
    marginBottom: "4px",
  },
  notificationTime: {
    fontSize: "11px",
    color: "#999",
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#667eea",
    position: "absolute",
    right: "15px",
  },
};

export default NotificationBell;
