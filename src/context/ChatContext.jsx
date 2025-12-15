// ChatContext.js
import React, { createContext, useState, useEffect } from "react";

export const ChatContext = createContext();

const CHAT_HISTORY_KEY = "nfinity_chat_history";

export const ChatProvider = ({ children }) => {
  // Restore view from sessionStorage on page load
  const initialView =
    typeof window !== "undefined"
      ? sessionStorage.getItem("nfinity_view") || "home"
      : "home";

  // Restore chat history from sessionStorage on page load
  const initialChatHistory = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(CHAT_HISTORY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("♻️ Restored chat history from storage:", parsed.length, "messages");
          return parsed;
        }
      } catch (error) {
        console.error("Failed to restore chat history:", error);
      }
    }
    return [];
  };

  const [showChatbot, setShowChatbot] = useState(false);
  const [view, setView] = useState(initialView);
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [shouldReloadHistory, setShouldReloadHistory] = useState(false);

  // Save chat history to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && chatHistory.length > 0) {
      try {
        sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        console.log("💾 Saved chat history to storage:", chatHistory.length, "messages");
      } catch (error) {
        console.error("Failed to save chat history:", error);
      }
    }
  }, [chatHistory]);

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
