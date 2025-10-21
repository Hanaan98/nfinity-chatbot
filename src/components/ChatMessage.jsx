import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import ChatbotIcon from "./ChatbotIcon";
import ProductCarousel from "./product/ProductCarousel";

const formatTime = (date) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "Invalid time";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

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
}) {
  const [showTime, setShowTime] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isModel = chat.role === "model";
  const isTyping = Boolean(chat.isTyping);
  const isError = Boolean(chat.isError);

  const messageTime = useMemo(() => chat.time || new Date(), [chat.time]);
  const content = chat.text ?? "";

  // detect carousel
  const isCarousel =
    chat.type === "carousel" || (chat.products?.length ?? 0) > 0;

  // typing only if no content and not a carousel
  const showDots = isModel && (isTyping || (!content && !isCarousel));

  const formattedContent = useMemo(() => formatMessage(content), [content]);

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
      } ${chat.products ? "!block" : ""}`}
      role="listitem"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isModel && <ChatbotIcon />}

      {/* ===== CAROUSEL MESSAGE (no bubble) WITH OPTIONAL CAPTION ===== */}
      {isCarousel ? (
        <div className="w-full max-w-full">
          {showDots ? (
            <div className="typing-dots py-2" aria-label="Assistant is typing">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          ) : (
            <>
              {/* caption line above the carousel if chat.text exists */}
              {content ? (
                <div
                  className="mb-2 mt-2 px-1 sm:px-2 text-sm text-gray-800 dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
              ) : null}

              <div className="w-full px-1 sm:px-2 mt-2">
                <ProductCarousel products={chat.products || []} />
              </div>
            </>
          )}
        </div>
      ) : (
        /* ===== ORIGINAL BUBBLE for all other messages ===== */
        <div className="message-wrap">
          {chat.image?.url && (
            <div className="message-image mb-2">
              {!imageError ? (
                <img
                  src={chat.image.url}
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

          <div className="message-text" onClick={handleClick}>
            {showDots ? (
              <div
                className="typing-dots py-2"
                aria-label="Assistant is typing"
              >
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
                    className="message-content"
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
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
