import React, { useRef, useEffect } from 'react';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div style={styles.container}>
      {messages.map((message) => (
        <div
          key={message._id}
          style={{
            ...styles.message,
            justifyContent: message.sender === currentUser?.id ? 'flex-end' : 'flex-start'
          }}
        >
          <div
            style={{
              ...styles.messageBubble,
              backgroundColor: message.sender === currentUser?.id ? '#667eea' : 'white',
              color: message.sender === currentUser?.id ? 'white' : '#333'
            }}
          >
            <div style={styles.senderName}>
              {message.senderUsername}
            </div>
            <div style={styles.messageContent}>
              {message.content}
            </div>
            <div style={styles.messageTime}>
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
  },
  message: {
    display: 'flex',
    marginBottom: '15px'
  },
  messageBubble: {
    maxWidth: '60%',
    padding: '10px 15px',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  senderName: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '5px',
    opacity: 0.8
  },
  messageContent: {
    fontSize: '14px',
    wordWrap: 'break-word'
  },
  messageTime: {
    fontSize: '10px',
    marginTop: '5px',
    opacity: 0.7,
    textAlign: 'right'
  }
};

export default MessageList;