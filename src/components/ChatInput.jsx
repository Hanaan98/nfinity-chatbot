import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useChat } from "../context/UseChat";
import { sendChat } from "../api/chatClient";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_MESSAGE_LENGTH = 2000;

export default function ChatInput({
  placeholder = "Type a message…",
  botIsTyping = false,
  setChatHistory,
  setIsOrderQuery,
  onMessageSend,
}) {
  const chatCtx = useChat();
  const setHistory = setChatHistory || chatCtx?.setChatHistory;

  const [value, setValue] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");

  const taRef = useRef(null);
  const fileInputRef = useRef(null);
  const composingRef = useRef(false);
  const submitTimeoutRef = useRef(null);

  const fileToDataUrl = useCallback(
    (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(f);
      }),
    []
  );

  const validateFile = useCallback((file) => {
    if (!file) return { isValid: false, error: "No file selected" };
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: "File size must be less than 10MB" };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: "Only JPEG, PNG, GIF, and WebP images are allowed",
      };
    }
    return { isValid: true, error: "" };
  }, []);

  const generateMessageId = useCallback(
    () =>
      globalThis.crypto?.randomUUID?.() ||
      `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, [previewUrl]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const resize = () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    };
    requestAnimationFrame(resize);
  }, [value]);

  useEffect(() => {
    if (error && value.trim()) setError("");
  }, [value, error]);

  const trimmedValue = value.trim();
  const hasText = trimmedValue.length > 0;
  const hasImage = !!file;
  const isOverLimit = trimmedValue.length > MAX_MESSAGE_LENGTH;

  const canSubmit = useMemo(
    () =>
      !botIsTyping &&
      !isSubmitting &&
      (hasText || hasImage) &&
      !isOverLimit &&
      !error &&
      !fileError,
    [
      botIsTyping,
      isSubmitting,
      hasText,
      hasImage,
      isOverLimit,
      error,
      fileError,
    ]
  );

  const resetInputs = useCallback(() => {
    setValue("");
    setError("");
    setFileError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (taRef.current) taRef.current.style.height = "auto";
  }, [previewUrl]);

  /** ---------- helpers to detect carousel replies ---------- */
  const safeJsonParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const extractProductsFromTags = (str) => {
    if (typeof str !== "string") return null;
    const m = str.match(/<products>([\s\S]*?)<\/products>/i);
    if (!m) return null;
    const json = safeJsonParse(m[1]);
    return json?.products?.length ? json.products : null;
  };

  const stripProductsTag = (str) =>
    typeof str === "string"
      ? str.replace(/<products>[\s\S]*<\/products>/i, "").trim()
      : "";

  const normalizeReplyToMessage = (reply, tempId) => {
    // 1) If server returns an object with products
    if (reply && typeof reply === "object") {
      // a) { type: 'carousel', products: [...] }
      if (
        (reply.type === "carousel" || reply.isProductRecommendation) &&
        Array.isArray(reply.products) &&
        reply.products.length
      ) {
        return {
          id: tempId,
          role: "model",
          isTyping: false,
          type: "carousel",
          products: reply.products,
          // ✅ keep caption if provided
          text: reply.text || reply.message || "",
        };
      }
      // b) Generic object with products field
      if (Array.isArray(reply.products) && reply.products.length) {
        return {
          id: tempId,
          role: "model",
          isTyping: false,
          type: "carousel",
          products: reply.products,
          // ✅ keep caption if provided
          text: reply.text || reply.message || "",
        };
      }
      // c) Fallback to text if present (support .text or .message)
      if (reply.text || reply.message) {
        return {
          id: tempId,
          role: "model",
          isTyping: false,
          text: String(reply.text || reply.message),
          type: reply.type, // harmless if undefined
        };
      }
    }

    // 2) If server returns a string
    if (typeof reply === "string") {
      // a) Try parse entire string as JSON
      const asJson = safeJsonParse(reply);
      if (asJson) {
        const normalized = normalizeReplyToMessage(asJson, tempId);
        if (normalized) return normalized;
      }
      // b) Try extract <products>...</products>; keep any leading caption
      const prods = extractProductsFromTags(reply);
      if (prods && prods.length) {
        return {
          id: tempId,
          role: "model",
          isTyping: false,
          type: "carousel",
          products: prods,
          text: stripProductsTag(reply), // ✅ keep caption outside the tag
        };
      }
      // c) Plain text
      return {
        id: tempId,
        role: "model",
        isTyping: false,
        text: reply,
      };
    }

    // 3) Unknown shape → fallback text
    return {
      id: tempId,
      role: "model",
      isTyping: false,
      text: "Sorry, I couldn't understand the response.",
    };
  };
  /** ------------------------------------------------------- */

  const handleFormSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit || !setHistory) return;

      if (!hasText && !hasImage) {
        setError("Please enter a message or select an image");
        return;
      }
      if (isOverLimit) {
        setError(
          `Message too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
        );
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        const userMsg = {
          id: generateMessageId(),
          role: "user",
          time: new Date().toLocaleTimeString(),
        };
        if (hasText) userMsg.text = trimmedValue;
        if (hasImage && file) {
          const dataUrl = await fileToDataUrl(file);
          userMsg.image = {
            name: file.name,
            url: dataUrl,
            type: file.type,
            size: file.size,
          };
        }

        // order keywords
        const orderKeywords = [
          "track",
          "order",
          "delivery",
          "shipping",
          "status",
        ];
        const isOrderRelated =
          hasText &&
          orderKeywords.some((k) => trimmedValue.toLowerCase().includes(k));
        if (isOrderRelated && setIsOrderQuery) setIsOrderQuery(true);

        // Add user message
        setHistory((h) => [...h, userMsg]);

        if (onMessageSend && hasText) {
          setTimeout(() => onMessageSend(trimmedValue), 50);
        }

        resetInputs();

        // temp bot typing
        const tempId = generateMessageId();
        const tempMessage = {
          id: tempId,
          role: "model",
          isTyping: true,
          text: "",
          time: new Date().toLocaleTimeString(),
        };
        setHistory((h) => [...h, tempMessage]);

        // call API
        const apiPromise = sendChat(userMsg.text || "Image uploaded");
        const timeoutPromise = new Promise((_, reject) => {
          submitTimeoutRef.current = setTimeout(() => {
            reject(new Error("Request timeout"));
          }, 30000);
        });

        const reply = await Promise.race([apiPromise, timeoutPromise]);
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);

        // ---------- normalize reply into either text or carousel message ----------
        const normalized = normalizeReplyToMessage(reply, tempId);

        // Replace temp typing with final normalized message
        setHistory((history) =>
          history.map((m) => (m.id === tempId ? normalized : m))
        );
      } catch (err) {
        console.error("Chat submission error:", err);
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);

        // mark the last typing message as error
        setHistory((history) =>
          history.map((m) =>
            m.isTyping
              ? {
                  ...m,
                  isTyping: false,
                  isError: true,
                  text:
                    err.message === "Request timeout"
                      ? "Request timed out. Please try again."
                      : "Sorry—having trouble reaching the server. Please try again.",
                }
              : m
          )
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      canSubmit,
      setHistory,
      hasText,
      hasImage,
      trimmedValue,
      file,
      fileToDataUrl,
      resetInputs,
      generateMessageId,
      isOverLimit,
      setIsOrderQuery,
      onMessageSend,
    ]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (composingRef.current) return;
      if (e.key === "Enter") {
        if (e.shiftKey) return;
        e.preventDefault();
        if (canSubmit) handleFormSubmit(e);
      } else if (e.key === "Escape") {
        if (hasText || hasImage) resetInputs();
      }
    },
    [canSubmit, handleFormSubmit, hasText, hasImage, resetInputs]
  );

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;
      const validation = validateFile(selectedFile);
      if (!validation.isValid) {
        setFileError(validation.error);
        e.target.value = "";
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFileError("");
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setPreviewUrl(url);
      taRef.current?.focus();
    },
    [previewUrl, validateFile]
  );

  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const getPlaceholder = () => (isSubmitting ? "Sending..." : placeholder);

  useEffect(() => {
    if (!isSubmitting && taRef.current) taRef.current.focus();
  }, [isSubmitting]);

  return (
    <div className="chat-input-container">
      {error && (
        <div
          className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {fileError && (
        <div
          className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          role="alert"
        >
          {fileError}
        </div>
      )}

      {file && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
            <img
              src={previewUrl}
              alt={file?.name || "Selected image"}
              className="w-full h-full object-cover"
              onError={() => {
                setFileError("Failed to load image preview");
                clearFile();
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm text-gray-700 truncate font-medium"
              title={file?.name}
            >
              {file?.name}
            </div>
            <div className="text-xs text-gray-500">
              {file && `${(file.size / 1024).toFixed(1)} KB`}
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors p-1"
            aria-label="Remove selected image"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form
        className="flex items-center gap-2 px-3 py-2 border rounded-3xl transition-colors"
        onSubmit={handleFormSubmit}
      >
      
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={taRef}
            className="w-full mt-2 text-sm resize-none border-none outline-none bg-transparent placeholder:text-gray-400 leading-relaxed"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            placeholder={getPlaceholder()}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH + 100}
            disabled={isSubmitting}
            aria-label="Message input"
            aria-describedby="char-count"
          />
          {value.trim() && (
            <div
              id="char-count"
              className={`absolute -bottom-7 right-0 text-xs text-[#e6e6e6] ${(() => {
                const ratio = value.trim().length / MAX_MESSAGE_LENGTH;
                if (ratio > 1) return "text-red-500";
                if (ratio > 0.9) return "text-orange-500";
                if (ratio > 0.8) return "text-yellow-600";
                return "text-gray-500";
              })()}`}
            >
              {value.trim().length}/{MAX_MESSAGE_LENGTH}
            </div>
          )}
        </div>

        <button
          type="submit"
          aria-label={isSubmitting ? "Sending message..." : "Send message"}
          disabled={!canSubmit}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 flex-shrink-0 ${
            isSubmitting ? "animate-pulse" : ""
          }`}
        >
          {isSubmitting ? (
            <svg
              width="18"
              height="18"
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
              >
                <animate
                  attributeName="stroke-dasharray"
                  dur="2s"
                  values="0 32;16 16;0 32;0 32"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-dashoffset"
                  dur="2s"
                  values="0;-16;-32;-32"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.53711 0.848145C8.79683 0.58853 9.21587 0.588517 9.47559 0.848145L17.1641 8.53662C17.4237 8.79633 17.4237 9.21537 17.1641 9.4751C16.9043 9.73482 16.4736 9.73479 16.2139 9.4751L9.66699 2.92822V17.1665C9.66699 17.5319 9.36628 17.8332 9.00098 17.8335C8.63545 17.8335 8.33398 17.532 8.33398 17.1665V2.93115L1.77637 9.4624C1.51565 9.72307 1.09664 9.7231 0.836914 9.46338C0.577483 9.20381 0.576775 8.78464 0.835938 8.5249L8.53711 0.848145Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      </form>

      {!value.trim() && !file && (
        <div className="mt-1 text-xs text-gray-500 text-center"></div>
      )}
    </div>
  );
}


  // <button
  //         type="button"
  //         onClick={handleFileClick}
  //         disabled={isSubmitting}
  //         aria-label="Attach image"
  //         className="flex items-center justify-center w-8 h-8 rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
  //       >
  //         <svg
  //           width="18"
  //           height="18"
  //           viewBox="0 0 24 24"
  //           fill="none"
  //           role="img"
  //           aria-hidden="true"
  //         >
  //           <path
  //             d="M16.5 6.75002V17.33C16.5 19.42 14.97 21.28 12.89 21.48C10.5 21.71 8.5 19.84 8.5 17.5V5.14002C8.5 3.83002 9.44 2.64002 10.74 2.51002C12.24 2.36002 13.5 3.53002 13.5 5.00002V15.5C13.5 16.05 13.05 16.5 12.5 16.5C11.95 16.5 11.5 16.05 11.5 15.5V6.75002C11.5 6.34002 11.16 6.00002 10.75 6.00002C10.34 6.00002 10 6.34002 10 6.75002V15.36C10 16.67 10.94 17.86 12.24 17.99C13.74 18.14 15 16.97 15 15.5V5.17002C15 3.08002 13.47 1.22002 11.39 1.02002C9.01 0.790024 7 2.66002 7 5.00002V17.27C7 20.14 9.1 22.71 11.96 22.98C15.25 23.28 18 20.72 18 17.5V6.75002C18 6.34002 17.66 6.00002 17.25 6.00002C16.84 6.00002 16.5 6.34002 16.5 6.75002Z"
  //             fill="currentColor"
  //           />
  //         </svg>
  //       </button>

  //       <input
  //         ref={fileInputRef}
  //         type="file"
  //         accept="image/*"
  //         className="hidden"
  //         onChange={handleFileChange}
  //         disabled={isSubmitting}
  //       />
