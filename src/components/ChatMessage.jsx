// src/components/ChatMessage.jsx
import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import ChatbotIcon from "./ChatbotIcon";

// sanitize + lightweight markdown
const sanitizeText = (text) =>
  typeof text !== "string"
    ? ""
    : text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const formatMessage = (text) => {
  if (!text) return "";
  const s = sanitizeText(text);
  return s
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /(https?:\/\/[^\s<>"']+)/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>'
    );
};

const RetryButton = React.memo(({ onRetry, disabled }) => (
  <button
    onClick={onRetry}
    disabled={disabled}
    className="mt-2 px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    aria-label="Retry sending message"
  >
    Try again
  </button>
));

const ChatMessage = React.memo(function ChatMessage({
  chat,
  onMediaLoad,
  onContentChange,
  onRetry,
  sessionId, // Added for feedback
}) {
  const [showTime, setShowTime] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Debug logging for images
  React.useEffect(() => {
    if (chat.images || chat.image) {
      console.log("📷 ChatMessage images:", {
        chatId: chat.id,
        hasImages: !!chat.images,
        imagesCount: chat.images?.length,
        images: chat.images,
        hasImage: !!chat.image,
        image: chat.image,
      });
    }
  }, [chat.images, chat.image, chat.id]);

  const isModel = chat.role === "model";
  const isTyping = Boolean(chat.isTyping);
  const isError = Boolean(chat.isError);

  const content = chat.text ?? "";

  // typing indicator should show when assistant is typing AND there's no content yet
  const showDots = isModel && isTyping && !content;

  const formattedContent = useMemo(() => formatMessage(content), [content]);

  // Fire onContentChange once dots stop (to help parent adjust scroll)
  const prevShowDotsRef = useRef(showDots);
  useLayoutEffect(() => {
    if (prevShowDotsRef.current && !showDots) {
      requestAnimationFrame(() => onContentChange?.(chat));
    }
    prevShowDotsRef.current = showDots;
  }, [showDots, onContentChange, chat]);

  const handleImageLoad = useCallback(() => {
    setImageError(false);
    requestAnimationFrame(() => onMediaLoad?.(chat));
  }, [onMediaLoad, chat]);

  const handleImageError = useCallback(() => setImageError(true), []);

  const handleRetry = useCallback(() => {
    if (onRetry && chat.id) onRetry(chat.id);
  }, [onRetry, chat.id]);

  if (chat.hideInChat) return null;

  const handleMouseEnter = () => setShowTime(true);
  const handleMouseLeave = () => setShowTime(false);
  const handleClick = () => setShowTime((s) => !s);

  return (
    <div
      data-mid={chat.id}
      className={`message ${isModel ? "bot" : "user"}-message ${
        chat.isError ? "error" : ""
      }`}
      role="listitem"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isModel && <ChatbotIcon />}

      {/* Standard bubble (no carousel logic here) */}
      <div className="message-wrap">
        {/* Support both single image (old format) and multiple images (new format) */}
        {chat.image?.url && (
          <div className="message-image mb-2">
            {!imageError ? (
              <img
                src={chat.image.previewUrl || chat.image.url}
                alt={chat.image.name || "Message attachment"}
                className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                Failed to load image
              </div>
            )}
            {chat.image?.name && !imageError && (
              <p className="text-xs text-gray-600 mt-1">{chat.image.name}</p>
            )}
          </div>
        )}

        {/* Multiple images support */}
        {chat.images &&
          Array.isArray(chat.images) &&
          chat.images.length > 0 && (
            <div
              className="message-images mb-2 grid gap-2"
              style={{
                gridTemplateColumns:
                  chat.images.length === 1
                    ? "1fr"
                    : "repeat(auto-fit, minmax(150px, 1fr))",
              }}
            >
              {chat.images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img.url || img.previewUrl}
                    alt={img.name || `Attachment ${idx + 1}`}
                    className="w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      console.error("Image load error:", img);
                      // Fallback to preview URL if Cloudinary URL fails
                      if (e.target.src === img.url && img.previewUrl) {
                        e.target.src = img.previewUrl;
                      } else {
                        handleImageError();
                      }
                    }}
                    loading="lazy"
                  />
                  {img.name && (
                    <p
                      className="text-xs text-gray-600 mt-1 truncate"
                      title={img.name}
                    >
                      {img.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

        <div className="message-text" onClick={handleClick}>
          {showDots ? (
            <div className="typing-dots py-2" aria-label="Assistant is typing">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {isError && (
                <div className="flex items-center gap-2 mb-2 text-red-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Message failed to send
                  </span>
                </div>
              )}

              {content ? (
                <div
                  className="message-content message-enter"
                  dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
              ) : (
                !showDots && (
                  <p className="text-gray-500 italic">
                    {isError ? "Failed to send message" : "No content"}
                  </p>
                )
              )}

              {isError && onRetry && (
                <RetryButton
                  onRetry={handleRetry}
                  disabled={isModel && isTyping}
                />
              )}
            </div>
          )}
        </div>

        {/* Optional time UI (kept for parity; keep commented if not used) */}
        {/* {showTime && (
          <div className="message-time">
            <span>{formatTime(messageTime)}</span>
          </div>
        )} */}
      </div>
    </div>
  );
});

export default ChatMessage;
