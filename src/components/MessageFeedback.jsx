import React, { useState } from "react";

/**
 * Message Feedback Component
 * Thumbs up/down buttons to rate message quality
 */
export default function MessageFeedback({
  messageId,
  sessionId,
  onFeedbackSubmit,
}) {
  const [feedback, setFeedback] = useState(null); // 'like' | 'dislike' | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type) => {
    if (feedback || isSubmitting) return; // Already submitted or submitting

    setIsSubmitting(true);
    setFeedback(type);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "/api";
      const response = await fetch(`${API_BASE}/chat/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          messageId,
          feedback: type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      const data = await response.json();

      if (onFeedbackSubmit) {
        onFeedbackSubmit(type, data);
      }

      console.log("Feedback submitted:", type);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setFeedback(null); // Reset on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="message-feedback">
      <button
        onClick={() => handleFeedback("like")}
        disabled={feedback !== null || isSubmitting}
        className={`feedback-button feedback-like ${
          feedback === "like" ? "active" : ""
        }`}
        title="This was helpful"
        aria-label="Like this response"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>

      <button
        onClick={() => handleFeedback("dislike")}
        disabled={feedback !== null || isSubmitting}
        className={`feedback-button feedback-dislike ${
          feedback === "dislike" ? "active" : ""
        }`}
        title="This wasn't helpful"
        aria-label="Dislike this response"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>

      <style jsx>{`
        .message-feedback {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .message-feedback:hover {
          opacity: 1;
        }

        .feedback-button {
          background: transparent;
          border: 1px solid #e5e7eb;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-center: center;
        }

        .feedback-button:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #d1d5db;
          transform: scale(1.05);
        }

        .feedback-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .feedback-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .feedback-button.active.feedback-like {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .feedback-button.active.feedback-dislike {
          background: #fee2e2;
          border-color: #ef4444;
          color: #ef4444;
        }

        .feedback-button svg {
          width: 16px;
          height: 16px;
        }
      `}</style>
    </div>
  );
}
