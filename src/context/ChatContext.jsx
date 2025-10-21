// ChatContext.js
import React, { createContext, useEffect, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [view, setView] = useState("home");
  const [chatHistory, setChatHistory] = useState([]);

  return (
    <ChatContext.Provider
      value={{
        showChatbot,
        setShowChatbot,
        view,
        setView,
        chatHistory,
        setChatHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
