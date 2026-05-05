import React from "react";
import { useTheme } from "../context/ThemeContext";

const LoadingScreen = () => {
  const { colors } = useTheme();

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: colors.background,
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    logoContainer: {
      marginBottom: "30px",
      animation: "bounce 1s ease-in-out infinite",
    },
    logo: {
      width: "200px",
      height: "200px",
      borderRadius: "50%",
      objectFit: "contain",
    },
    loadingBarContainer: {
      width: "280px",
      height: "4px",
      backgroundColor: colors.surfaceLight,
      borderRadius: "2px",
      overflow: "hidden",
      marginBottom: "15px",
    },
    loadingBar: {
      width: "0%",
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: "2px",
      animation: "loading 2s ease-in-out infinite",
    },
    loadingText: {
      color: colors.textLight,
      fontSize: "14px",
      marginTop: "10px",
    },
    appName: {
      color: colors.text,
      fontSize: "18px",
      fontWeight: "bold",
    //   marginTop: "15px",
       marginBottom: "30px",
      letterSpacing: "1px",
    },
    dots: {
      display: "inline-block",
      animation: "dots 1.5s steps(4, end) infinite",
    },
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
          }
        `}
      </style>

      <div style={styles.logoContainer}>
        <img src="/favicon-192x192.png" alt="Uraiyadal" style={styles.logo} />
      </div>

      <div style={styles.appName}>Uraiyadal</div>

      <div style={styles.loadingBarContainer}>
        <div style={styles.loadingBar}></div>
      </div>

      <div style={styles.loadingText}>
        Loading <span style={styles.dots}>...</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
