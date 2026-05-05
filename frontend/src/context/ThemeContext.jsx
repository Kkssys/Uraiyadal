import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const theme = {
    darkMode,
    toggleDarkMode,
    colors: darkMode ? darkColors : lightColors
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Light mode colors
const lightColors = {
  background: '#f0f0f0',
  surface: '#ffffff',
  surfaceLight: '#f9f9f9',
  text: '#333333',
  textLight: '#666666',
  textLighter: '#999999',
  border: '#e0e0e0',
  primary: '#667eea',
  primaryHover: '#5a67d8',
  secondary: '#764ba2',
  success: '#4CAF50',
  error: '#f44336',
  warning: '#ff9800',
  online: '#4CAF50',
  offline: '#999999',
  messageSent: '#667eea',
  messageReceived: '#e0e0e0',
  messageSentText: '#ffffff',
  messageReceivedText: '#333333',
  inputBackground: '#ffffff',
  inputBorder: '#dddddd',
  scrollbarTrack: '#f1f1f1',
  scrollbarThumb: '#c1c1c1',
  scrollbarThumbHover: '#a8a8a8'
};

// Dark mode colors
const darkColors = {
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#1a1a3e',
  text: '#e0e0e0',
  textLight: '#b0b0b0',
  textLighter: '#808080',
  border: '#2a2a4e',
  primary: '#667eea',
  primaryHover: '#7c8eef',
  secondary: '#764ba2',
  success: '#4CAF50',
  error: '#f44336',
  warning: '#ff9800',
  online: '#4CAF50',
  offline: '#666666',
  messageSent: '#667eea',
  messageReceived: '#2a2a4e',
  messageSentText: '#ffffff',
  messageReceivedText: '#e0e0e0',
  inputBackground: '#1a1a3e',
  inputBorder: '#2a2a4e',
  scrollbarTrack: '#1a1a3e',
  scrollbarThumb: '#2a2a4e',
  scrollbarThumbHover: '#3a3a5e'
};