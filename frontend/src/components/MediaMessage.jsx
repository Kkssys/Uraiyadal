import React, { useState } from "react";
import axios from "axios";
import MessageMenu from "./MessageMenu";

const MediaMessage = ({ message, isOwn, currentUser, onDelete }) => {
  const [showFull, setShowFull] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleDownload = async () => {
    try {
      const filename = message.mediaUrl.split("/").pop();
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/download-media/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", message.mediaName || "download");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleDeleteMessage = (messageId, type) => {
    onDelete(messageId, type);
    setShowMenu(false);
  };

  const renderMedia = () => {
    if (message.messageType === "image") {
      return (
        <div style={styles.mediaContainer}>
          <img
            src={`https://uraiyadal-o842.onrender.com${message.mediaUrl}`}
            alt={message.mediaName}
            style={styles.image}
            onClick={() => setShowFull(!showFull)}
          />
          {showFull && (
            <div
              style={styles.fullscreenOverlay}
              onClick={() => setShowFull(false)}
            >
              <img
                src={`https://uraiyadal-o842.onrender.com${message.mediaUrl}`}
                alt="Full"
                style={styles.fullscreenImage}
              />
            </div>
          )}
        </div>
      );
    }

    if (message.messageType === "video") {
      return (
        <video controls style={styles.video}>
          <source
            src={`https://uraiyadal-o842.onrender.com${message.mediaUrl}`}
          />
        </video>
      );
    }

    if (message.messageType === "audio") {
      return (
        <audio controls style={styles.audio}>
          <source
            src={`https://uraiyadal-o842.onrender.com${message.mediaUrl}`}
          />
        </audio>
      );
    }

    return (
      <div style={styles.fileContainer} onClick={handleDownload}>
        <span style={styles.fileIcon}>📎</span>
        <div style={styles.fileInfo}>
          <div style={styles.fileName}>{message.mediaName}</div>
          <div style={styles.fileSize}>{formatFileSize(message.mediaSize)}</div>
        </div>
        <button style={styles.downloadButton}>📥</button>
      </div>
    );
  };

  if (message.messageType === "deleted") {
    return (
      <div style={styles.deletedMessage}>
        <span>🗑️ Message has been deleted</span>
      </div>
    );
  }

  return (
    <div style={styles.messageWrapper}>
      <div style={styles.messageContainer}>
        {renderMedia()}
        {message.content && <div style={styles.caption}>{message.content}</div>}
        <div style={styles.messageFooter}>
          <span style={styles.messageTime}>
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
          <button
            style={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋮
          </button>
        </div>
      </div>
      {showMenu && (
        <div style={styles.menuContainer}>
          <MessageMenu
            message={message}
            currentUser={currentUser}
            onDelete={handleDeleteMessage}
            onClose={() => setShowMenu(false)}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  messageWrapper: {
    position: "relative",
    maxWidth: "300px",
  },
  messageContainer: {
    position: "relative",
  },
  mediaContainer: {
    cursor: "pointer",
  },
  image: {
    maxWidth: "250px",
    maxHeight: "200px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  fullscreenOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  fullscreenImage: {
    maxWidth: "90%",
    maxHeight: "90%",
  },
  video: {
    maxWidth: "280px",
    borderRadius: "8px",
  },
  audio: {
    width: "250px",
  },
  fileContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    cursor: "pointer",
    minWidth: "200px",
  },
  fileIcon: {
    fontSize: "32px",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: "12px",
    color: "#333",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontSize: "10px",
    color: "#999",
  },
  downloadButton: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },
  caption: {
    fontSize: "12px",
    marginTop: "5px",
    color: "#666",
  },
  messageFooter: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "8px",
    marginTop: "5px",
  },
  messageTime: {
    fontSize: "10px",
    opacity: 0.7,
  },
  menuButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#999",
    padding: "2px 5px",
    borderRadius: "3px",
  },
  menuContainer: {
    position: "absolute",
    bottom: "100%",
    right: "0",
    zIndex: 101,
  },
  deletedMessage: {
    padding: "8px 12px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    color: "#999",
    fontSize: "12px",
    fontStyle: "italic",
    textAlign: "center",
  },
};

export default MediaMessage;
