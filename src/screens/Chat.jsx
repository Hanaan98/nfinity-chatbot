import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Chatbot from "../Chatbot";
import logo from "../assets/logo_white.webp";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import { useChat } from "../context/UseChat";
import ProductCarousel from "../components/product/ProductCarousel";
import { getMessages } from "../api/chatClient";

const SCROLL_THRESHOLD = 80;
const MODAL_Z_INDEX = 50;

const Chat = () => {
  const chatBodyRef = useRef(null);
  const endRef = useRef(null);
  const previousFocusRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isOrderQuery, setIsOrderQuery] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const isFirstMount = useRef(true);

  const {
    setView,
    showChatbot,
    setShowChatbot,
    chatHistory,
    setChatHistory,
    shouldReloadHistory,
    setShouldReloadHistory,
  } = useChat();

  const formattedDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  }, []);

  // Load chat history when component mounts or when returning to chat view
  useEffect(() => {
    const loadChatHistory = async () => {
      // Skip if already loaded and not explicitly told to reload
      if (historyLoaded && !shouldReloadHistory) return;

      // Skip on first mount if chat already has messages (HelpMenu just added them)
      if (isFirstMount.current && chatHistory.length > 0) {
        isFirstMount.current = false;
        setHistoryLoaded(true);
        return;
      }

      // Mark that we've mounted at least once
      if (isFirstMount.current) {
        isFirstMount.current = false;
      }

      // Don't reload if history is already loaded and we're not explicitly asking for reload
      if (historyLoaded && !shouldReloadHistory) {
        console.log("⏭️ Skipping history load - already loaded");
        return;
      }

      // Small delay to let HelpMenu add messages first
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check again if messages were added by HelpMenu
      if (chatHistory.length > 0 && !shouldReloadHistory) {
        console.log("⏭️ Skipping history load - messages already present");
        setHistoryLoaded(true);
        return;
      }

      setIsLoadingHistory(true);
      try {
        console.log("🔄 Loading chat history...");

        // Load all pages of messages
        let allMessages = [];
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
          const response = await getMessages({ after: cursor });
          console.log("📦 Received response:", response);

          if (response.messages && Array.isArray(response.messages)) {
            allMessages = [...allMessages, ...response.messages];
            cursor = response.cursor;
            hasMore = response.has_more && cursor;
            console.log(
              `📄 Loaded ${response.messages.length} messages, total: ${allMessages.length}, hasMore: ${hasMore}`
            );
          } else {
            hasMore = false;
          }
        }

        console.log(`✅ Found ${allMessages.length} total messages`);

        if (allMessages.length > 0) {
          // Transform backend messages to match our chat format
          const transformedMessages = allMessages.map((msg) => {
            // Handle content that might be an object or string
            let messageText = "";
            if (typeof msg.content === "string") {
              messageText = msg.content;
            } else if (msg.content && typeof msg.content === "object") {
              messageText = msg.content.message || msg.content.text || "";
            }

            return {
              id: msg.id || msg._id || `msg_${Date.now()}_${Math.random()}`,
              role: msg.role === "assistant" ? "model" : msg.role || "user",
              text: messageText || msg.text || msg.message || "",
              time: msg.created_at
                ? new Date(msg.created_at * 1000).toLocaleTimeString()
                : msg.time || msg.timestamp || new Date().toISOString(),
              ...(msg.products && { products: msg.products }),
              ...(msg.type && { type: msg.type }),
              ...(msg.image && { image: msg.image }),
              ...(msg.images && { images: msg.images }),
              ...(msg.imageUrls && {
                images: msg.imageUrls.map((url) => ({ url })),
              }),
            };
          });

          // Reverse the array to show oldest messages first
          const orderedMessages = transformedMessages.reverse();

          console.log(
            "💬 Setting chat history with messages:",
            orderedMessages
          );
          console.log(
            "⚠️ WARNING: Replacing entire chat history from server load"
          );
          setChatHistory(orderedMessages);
        } else {
          console.log("⚠️ No messages to display");
        }

        setHistoryLoaded(true);
        setShouldReloadHistory(false);
      } catch (error) {
        console.error("❌ Failed to load chat history:", error);
        // Don't show error to user, just start with empty history
        setHistoryLoaded(true);
        setShouldReloadHistory(false);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [
    shouldReloadHistory,
    historyLoaded,
    // Removed chatHistory.length to prevent reload when messages are added
    setChatHistory,
    setShouldReloadHistory,
  ]);

  const handleBackClick = useCallback(() => {
    // Just go back to home - don't change reload flag
    // History will be preserved and reloaded when returning to same topic
    setView("home");
  }, [setView]);
  const handleMinimize = useCallback(
    () => setShowChatbot(false),
    [setShowChatbot]
  );

  // ensure every message has an id
  useEffect(() => {
    setChatHistory((history) =>
      history.map((message) =>
        message.id
          ? message
          : {
              ...message,
              id:
                globalThis.crypto?.randomUUID?.() ||
                `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            }
      )
    );
  }, [setChatHistory]);

  const isNearBottom = useCallback((el, threshold = SCROLL_THRESHOLD) => {
    if (!el) return false;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (endRef.current) {
      endRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "nearest",
      });
      return;
    }
    const el = chatBodyRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // NEW: scroll a specific message's TOP into view
  const scrollMessageTopIntoView = useCallback((messageId) => {
    const container = chatBodyRef.current;
    if (!container) return;
    const node = container.querySelector(`[data-mid="${messageId}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  useLayoutEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const shouldStick = isNearBottom(el);
    const rafId = requestAnimationFrame(() => {
      scrollToBottom(shouldStick);
    });
    return () => cancelAnimationFrame(rafId);
  }, [chatHistory, isNearBottom, scrollToBottom]);

  // Force scroll to bottom when chat history is first loaded or when new messages arrive
  useEffect(() => {
    if (chatHistory.length > 0 && !isLoadingHistory) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatHistory.length, isLoadingHistory, scrollToBottom]);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => {
      if (isNearBottom(el)) scrollToBottom(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isNearBottom, scrollToBottom]);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const mo = new MutationObserver(() => {
      if (isNearBottom(el)) {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [isNearBottom]);

  // UPDATED: receive chat to know when to top-anchor carousels
  const handleContentChange = useCallback(
    (chat) => {
      const el = chatBodyRef.current;
      if (!el) return;
      if (chat?.type === "carousel") {
        scrollMessageTopIntoView(chat.id);
        return;
      }
      if (isNearBottom(el)) scrollToBottom(false);
    },
    [isNearBottom, scrollToBottom, scrollMessageTopIntoView]
  );

  const handleMediaLoad = useCallback(
    (chat) => {
      const el = chatBodyRef.current;
      if (!el) return;
      if (chat?.type === "carousel") {
        scrollMessageTopIntoView(chat.id);
        return;
      }
      if (isNearBottom(el)) scrollToBottom(false);
    },
    [isNearBottom, scrollToBottom, scrollMessageTopIntoView]
  );

  const handleImageClick = useCallback((imageUrl) => {
    previousFocusRef.current = document.activeElement;
    setSelectedImage(imageUrl);
  }, []);

  const handleCloseImageViewer = useCallback(() => {
    setSelectedImage(null);
    if (previousFocusRef.current) previousFocusRef.current.focus();
  }, []);

  // modal lifecycle + esc
  useEffect(() => {
    if (!selectedImage) return;
    const handleEscape = (e) => e.key === "Escape" && handleCloseImageViewer();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedImage, handleCloseImageViewer]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateOrderNumber = (n) => n.trim().length >= 3;

  const handleEmailChange = useCallback(
    (e) => {
      const value = e.target.value;
      setEmail(value);
      if (emailError && validateEmail(value)) setEmailError("");
    },
    [emailError]
  );

  const handleOrderNumberChange = useCallback(
    (e) => {
      const value = e.target.value;
      setOrderNumber(value);
      if (orderError && validateOrderNumber(value)) setOrderError("");
    },
    [orderError]
  );

  const handleSubmitOrderQuery = useCallback(async () => {
    let hasError = false;
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }
    if (!validateOrderNumber(orderNumber)) {
      setOrderError(
        "Please enter a valid order number (at least 3 characters)"
      );
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setChatHistory((prev) => [
        ...prev,
        {
          id: globalThis.crypto?.randomUUID?.() || `msg_${Date.now()}`,
          role: "system",
          text: `Thank you for providing your details. We are processing your order query for ${email} with order number ${orderNumber}.`,
          time: new Date().toISOString(),
        },
      ]);
      setEmail("");
      setOrderNumber("");
      setIsOrderQuery(false);
    } catch (err) {
      console.error("Error submitting order query:", err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: globalThis.crypto?.randomUUID?.() || `msg_${Date.now()}`,
          role: "system",
          text: "Sorry, there was an error processing your request. Please try again.",
          time: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, orderNumber, setChatHistory]);

  const chatMessages = useMemo(() => {
    return chatHistory.map((chat) => (
      <div key={chat.id} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {/* Keep your separate image element so the modal viewer works and avoid duplicates */}
          {chat.image?.url && !chat.text && (
            <img
              src={chat.image.url}
              alt={chat.image.name || "Attachment"}
              className="max-w-xs rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleImageClick(chat.image.url)}
              onLoad={() => handleMediaLoad(chat)}
              onError={(e) => {
                console.error("Failed to load image:", chat.image.url);
                e.target.style.display = "none";
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleImageClick(chat.image.url);
                }
              }}
            />
          )}

          {/* ✅ FIX: also render ChatMessage when the bot is typing */}
          {(chat.text || chat.products || chat.image || chat.isTyping) && (
            <ChatMessage
              chat={chat}
              sessionId={chat.sessionId}
              onMediaLoad={handleMediaLoad}
              onContentChange={handleContentChange}
            />
          )}
          {chat.products && <ProductCarousel products={chat.products || []} />}
        </div>
      </div>
    ));
  }, [chatHistory, handleImageClick, handleContentChange, handleMediaLoad]);

  return (
    <Chatbot showChatbot={showChatbot} setShowChatbot={setShowChatbot}>
      <div
        className={`chatbot-popup-chatbox ${
          showChatbot ? "expanded" : "collapsed"
        }`}
      >
        <div className="chat-header-chatbox">
          <div className="header-info-chatbox">
            <button
              className="back_button"
              onClick={handleBackClick}
              aria-label="Go back to main menu"
              type="button"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M14.71 6.70998C14.32 6.31998 13.69 6.31998 13.3 6.70998L8.70998 11.3C8.31998 11.69 8.31998 12.32 8.70998 12.71L13.3 17.3C13.69 17.69 14.32 17.69 14.71 17.3C15.1 16.91 15.1 16.28 14.71 15.89L10.83 12L14.71 8.11998C15.1 7.72998 15.09 7.08998 14.71 6.70998Z"
                  fill="#ffffff"
                />
              </svg>
            </button>
            <img src={logo} width="140" height="24" alt="Nfinity Logo" />
          </div>
          <button
            className="material-symbols-rounded"
            onClick={handleMinimize}
            aria-label="Minimize chat"
            type="button"
          >
            keyboard_arrow_down
          </button>
        </div>

        <div className="chat-body-still-chatbox">
          <p className="date" role="status">
            {formattedDate}
          </p>

          <div
            ref={chatBodyRef}
            className="chat-body"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="animate-spin"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="32"
                      strokeDashoffset="32"
                      opacity="0.25"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="32"
                      strokeDashoffset="32"
                      strokeLinecap="round"
                      opacity="0.75"
                    >
                      <animate
                        attributeName="stroke-dasharray"
                        dur="1.5s"
                        values="0 32;16 16;0 32;0 32"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-dashoffset"
                        dur="1.5s"
                        values="0;-16;-32;-32"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                  <span className="text-sm text-gray-500">
                    Loading chat history...
                  </span>
                </div>
              </div>
            ) : (
              chatMessages
            )}
            <div ref={endRef} aria-hidden="true" />
          </div>

          <ChatInput
            setChatHistory={setChatHistory}
            setIsOrderQuery={setIsOrderQuery}
          />
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center"
          style={{ zIndex: MODAL_Z_INDEX }}
          onClick={handleCloseImageViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <div
            className="relative bg-white p-4 rounded-lg max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-w-[90vw] max-h-[80vh] object-contain"
              onError={() => {
                console.error("Failed to load enlarged image:", selectedImage);
                handleCloseImageViewer();
              }}
            />
            <button
              className="absolute top-2 right-2 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
              onClick={handleCloseImageViewer}
              aria-label="Close image viewer"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </Chatbot>
  );
};

export default Chat;
