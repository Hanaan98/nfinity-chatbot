import { useChat } from "../context/UseChat";
import { useCallback, useMemo } from "react";
import { sendChat } from "../api/chatClient";

export default function HelpMenu({ items = [], className = "" }) {
  const { setView, setChatHistory } = useChat();

  const validItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && typeof item === "object" && item.id && item.label);
  }, [items]);

  const generateMessageId = useCallback(() => {
    return (
      globalThis.crypto?.randomUUID?.() ||
      `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
  }, []);

  const clickHandler = useCallback(
    async (item) => {
      try {
        if (!item?.id) return;

        // Go to chat view and start clean
        setView("chat");
        setChatHistory([]);

        // Only keep seeded USER messages (strip any model messages)
        let initialHistory = [];
        if (Array.isArray(item.ChatHistory)) {
          initialHistory = item.ChatHistory
            .filter((m) => m?.role === "user" && m.text)
            .map((m) => ({
              ...m,
              id: m.id || generateMessageId(),
              time: m.time || new Date().toLocaleTimeString(),
            }));
        }

        // Set user-only history (or keep empty)
        setChatHistory(initialHistory);

        // If a seeded user message exists, immediately send it to backend
        const userMessage = initialHistory.find((m) => m.role === "user");
        if (userMessage?.text) {
          const tempId = generateMessageId();
          setChatHistory((prev) => [
            ...prev,
            {
              id: tempId,
              role: "model",
              isTyping: true,
              text: "",
              time: new Date().toLocaleTimeString(),
            },
          ]);

          try {
            const reply = await sendChat(userMessage.text);
            setChatHistory((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      isTyping: false,
                      text: reply,
                      isProductRecommendation: false,
                    }
                  : m
              )
            );
          } catch (error) {
            console.error("HelpMenu: sendChat error", error);
            setChatHistory((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      isTyping: false,
                      isError: true,
                      text:
                        "Sorry—having trouble reaching the server. Please try again.",
                    }
                  : m
              )
            );
          }
        }

        // No greeting fallbacks here — we only show bot text when API responds.

        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "help_menu_click", {
            help_category: item.id,
            help_label: item.label,
          });
        }
      } catch (err) {
        console.error("HelpMenu: Error handling click:", err);
        setView("chat");
        setChatHistory([]); // keep empty on error
      }
    },
    [setView, setChatHistory, generateMessageId]
  );

  const handleKeyDown = useCallback(
    (event, item) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        clickHandler(item);
      }
    },
    [clickHandler]
  );

  if (validItems.length === 0) {
    return (
      <section className={`hm-wrap empty-state ${className}`} aria-label="Help menu">
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No help topics available</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`hm-wrap ${className}`} aria-label="Help menu">
      <ul className="hm-list" role="menu">
        {validItems.map((item) => {
          const isHighlighted = Boolean(item.highlight);
          const hasDescription = Boolean(item.description);

          return (
            <li key={item.id} className={`hm-item ${isHighlighted ? "highlight" : ""}`} role="none">
              <button
                type="button"
                className="hm-row"
                onClick={() => clickHandler(item)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                aria-label={`Get help with ${item.label}${hasDescription ? `: ${item.description}` : ""}`}
                role="menuitem"
                tabIndex={0}
              >
                <span className="hm-left">
                  {item.badge && (
                    <span className="hm-badge bg-[#f2f2f2] p-1 rounded-md transition-colors duration-200 flex items-center justify-center">
                      {typeof item.badge === "string" ? (
                        <span className="text-xs font-medium text-gray-700">{item.badge}</span>
                      ) : (
                        item.badge
                      )}
                    </span>
                  )}
                  <div className="hm-text-content">
                    <span className="hm-label">{item.label}</span>
                    {hasDescription && (
                      <span className="hm-description text-xs text-gray-600 block mt-1">
                        {item.description}
                      </span>
                    )}
                  </div>
                </span>

                <span className="hm-chevron transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
                    <path
                      d="M9.29006 6.71002C8.90006 7.10002 8.90006 7.73002 9.29006 8.12002L13.1701 12L9.29006 15.88C8.90006 16.27 8.90006 16.9 9.29006 17.29C9.68006 17.68 10.3101 17.68 10.7001 17.29L15.2901 12.7C15.6801 12.31 15.6801 11.68 15.2901 11.29L10.7001 6.70002C10.3201 6.32002 9.68006 6.32002 9.29006 6.71002Z"
                      fill="currentColor"
                      className="text-gray-600 group-hover:text-gray-900 transition-colors duration-200"
                    />
                  </svg>
                </span>
              </button>

              <div className="hm-loading hidden absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
