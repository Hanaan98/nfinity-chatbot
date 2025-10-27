// ChatContext.js
import React, { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // Restore view from sessionStorage on page load
  const initialView =
    typeof window !== "undefined"
      ? sessionStorage.getItem("nfinity_view") || "home"
      : "home";

  const [showChatbot, setShowChatbot] = useState(false);
  const [view, setView] = useState(initialView);
  const [chatHistory, setChatHistory] = useState([]);
  const [shouldReloadHistory, setShouldReloadHistory] = useState(false);

  // Save view to sessionStorage whenever it changes
  const setViewWithPersistence = (newView) => {
    setView(newView);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nfinity_view", newView);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        showChatbot,
        setShowChatbot,
        view,
        setView: setViewWithPersistence,
        chatHistory,
        setChatHistory,
        shouldReloadHistory,
        setShouldReloadHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
