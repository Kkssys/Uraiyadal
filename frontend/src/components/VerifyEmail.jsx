import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setError('No verification token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/verify-email`, {
          token
        });
        
        login(response.data.user, response.data.token);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (err) {
        setError(err.response?.data?.error || 'Verification failed');
        setLoading(false);
      }
    };

    verifyEmail();
  }, [location, navigate, login]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>
          <h2>Verifying your email...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>
          <h2 style={styles.errorText}>Verification Failed</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/login')} style={styles.button}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.message}>
        <h2 style={styles.successText}>Email Verified Successfully!</h2>
        <p>Redirecting to chat...</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  },
  message: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  errorText: {
    color: '#c33'
  },
  successText: {
    color: '#3c3'
  },
  button: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  }
};

export default VerifyEmail;