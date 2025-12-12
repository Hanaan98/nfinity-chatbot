import React from "react";
import "./LoadingAnimation.css";

/**
 * Enhanced AI Loading Animation Component
 * Shows different states: thinking, analyzing, finalizing with star effects
 */
export default function LoadingAnimation({ state = "thinking" }) {
  const getStateConfig = () => {
    switch (state) {
      case "thinking":
        return {
          text: "Thinking",
          color: "#3b82f6", // blue
          dots: true,
        };
      case "analyzing":
        return {
          text: "Analyzing",
          color: "#8b5cf6", // purple
          dots: true,
        };
      case "finalizing":
        return {
          text: "Finalizing",
          color: "#10b981", // green
          dots: true,
        };
      case "complete":
        return {
          text: "Ready",
          color: "#10b981",
          dots: false,
        };
      default:
        return {
          text: "Processing",
          color: "#6b7280",
          dots: true,
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className="loading-animation-container">
      {/* Star particles background */}
      <div className="star-particles">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              "--delay": `${i * 0.15}s`,
              "--duration": `${2 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className="loading-content">
        <div className="loading-icon" style={{ color: config.color }}>
          <div className="pulse-ring" style={{ borderColor: config.color }} />
        </div>
        <div className="loading-text" style={{ color: config.color }}>
          {config.text}
          {config.dots && (
            <span className="loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          )}
        </div>
      </div>

      {/* Shimmer effect */}
      <div className="shimmer-effect" />
    </div>
  );
}
