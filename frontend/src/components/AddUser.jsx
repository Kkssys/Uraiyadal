import React, { useState } from "react";
import axios from "axios";

const AddUser = ({ onClose, onUserAdded }) => {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [addingUserId, setAddingUserId] = useState(null);

  const handleSearch = async () => {
    if (searchEmail.length < 3) {
      setError("Please enter at least 3 characters");
      return;
    }

    setSearching(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/search-users?email=${searchEmail}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError("No users found");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = async (userId) => {
    setAddingUserId(userId);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "/api/add-contact",
        { contactId: userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onUserAdded(response.data.contact);
      setSearchResults(searchResults.filter((u) => u._id !== userId));
    } catch (error) {
      setError(error.response?.data?.error || "Failed to add user");
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>Add New Contact</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.searchSection}>
            <input
              type="email"
              placeholder="Enter email address to search..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={styles.searchInput}
            />
            <button
              onClick={handleSearch}
              style={styles.searchButton}
              disabled={searching}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.results}>
            {searchResults.map((user) => (
              <div key={user._id} style={styles.resultItem}>
                {user.profilePicture ? (
                  <img
                    src={`https://uraiyadal-o842.onrender.com${user.profilePicture}`}
                    alt={user.username}
                    style={styles.avatar}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={styles.userDetails}>
                  <div style={styles.userName}>{user.username}</div>
                  <div style={styles.userEmail}>{user.email}</div>
                  <div style={styles.userStatus}>
                    {user.online
                      ? "🟢 Online"
                      : `⚫ Last seen ${new Date(user.lastSeen).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleAddContact(user._id)}
                  style={styles.addButton}
                  disabled={addingUserId === user._id}
                >
                  {addingUserId === user._id ? "Adding..." : "Add"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
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
    backgroundColor: "white",
    borderRadius: "10px",
    width: "90%",
    maxWidth: "500px",
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
    borderBottom: "1px solid #e0e0e0",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
  },
  content: {
    padding: "20px",
    flex: 1,
    overflowY: "auto",
  },
  searchSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  searchInput: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    outline: "none",
  },
  searchButton: {
    padding: "12px 24px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  error: {
    backgroundColor: "#fee",
    color: "#c33",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "15px",
    textAlign: "center",
  },
  results: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
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
    backgroundColor: "#667eea",
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
  userName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: "12px",
    color: "#666",
    marginTop: "2px",
  },
  userStatus: {
    fontSize: "11px",
    marginTop: "4px",
    color: "#999",
  },
  addButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default AddUser;
