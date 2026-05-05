import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

const BlockedUsers = ({ onClose, onUnblock }) => {
  const { colors } = useTheme();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/blocked-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(response.data);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    if (
      window.confirm(
        `Are you sure you want to unblock ${username}? They will be able to contact you again.`,
      )
    ) {
      setUnblocking(userId);
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`/api/unblock-user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Remove from list immediately
        setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));

        // Notify parent to refresh friends list
        if (onUnblock) {
          await onUnblock();
        }

        alert(
          `${username} unblocked successfully. They will reappear in your friends list.`,
        );
      } catch (error) {
        console.error("Error unblocking user:", error);
        alert("Failed to unblock user");
      } finally {
        setUnblocking(null);
      }
    }
  };

  const dynamicStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: "10px",
      width: "90%",
      maxWidth: "450px",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px",
      borderBottom: `1px solid ${colors.border}`,
      color: colors.text,
    },
    content: {
      padding: "20px",
      flex: 1,
      overflowY: "auto",
    },
    loading: {
      textAlign: "center",
      padding: "40px",
      color: colors.textLighter,
    },
    noBlocked: {
      textAlign: "center",
      padding: "40px",
      color: colors.textLighter,
    },
    blockedItem: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      padding: "15px",
      margin: "10px 0",
      backgroundColor: colors.surfaceLight,
      borderRadius: "10px",
    },
    avatar: {
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      objectFit: "cover",
    },
    avatarPlaceholder: {
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      backgroundColor: colors.primary,
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      fontWeight: "bold",
    },
    userDetails: {
      flex: 1,
    },
    username: {
      fontSize: "16px",
      fontWeight: "600",
      color: colors.text,
    },
    userEmail: {
      fontSize: "12px",
      color: colors.textLighter,
      marginTop: "2px",
    },
    unblockButton: {
      padding: "8px 16px",
      backgroundColor: colors.success,
      color: "white",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      transition: "opacity 0.3s",
    },
  };

  return (
    <div style={dynamicStyles.overlay}>
      <div style={dynamicStyles.modal}>
        <div style={dynamicStyles.header}>
          <h2>Blocked Users</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
            }}
          >
            ✕
          </button>
        </div>

        <div style={dynamicStyles.content}>
          {loading ? (
            <div style={dynamicStyles.loading}>Loading...</div>
          ) : blockedUsers.length === 0 ? (
            <div style={dynamicStyles.noBlocked}>No blocked users</div>
          ) : (
            blockedUsers.map((user) => (
              <div key={user._id} style={dynamicStyles.blockedItem}>
                {user.profilePicture ? (
                  <img
                    src={`https://uraiyadal-o842.onrender.com${user.profilePicture}`}
                    alt={user.username}
                    style={dynamicStyles.avatar}
                  />
                ) : (
                  <div style={dynamicStyles.avatarPlaceholder}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={dynamicStyles.userDetails}>
                  <div style={dynamicStyles.username}>{user.username}</div>
                  <div style={dynamicStyles.userEmail}>{user.email}</div>
                </div>
                <button
                  onClick={() => handleUnblock(user._id, user.username)}
                  style={dynamicStyles.unblockButton}
                  disabled={unblocking === user._id}
                >
                  {unblocking === user._id ? "..." : "Unblock"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedUsers;
