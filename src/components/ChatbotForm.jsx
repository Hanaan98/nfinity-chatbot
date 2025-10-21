import { useRef } from "react";
import { useChat } from "../context/UseChat";
const ChatForm = () => {
  const inputRef = useRef();
  const { setChatHistory } = useChat();
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = inputRef.current.value.trim();
    if (!userMessage) return;
    inputRef.current.value = "";

    setChatHistory((history) => [
      ...history,
      { role: "user", text: userMessage },
    ]);

    setTimeout(() => {
      setChatHistory((history) => [
        ...history,
        { role: "model", text: "Thinking..." },
      ]);
    }, 600);
  };
  return (
    <form onSubmit={handleFormSubmit} className="chat-form">
      <input
        ref={inputRef}
        placeholder="Message..."
        className="message-input"
        required
      />
      <button
        type="submit"
        id="send-message"
        className="material-symbols-rounded"
      >
        arrow_upward
      </button>
    </form>
  );
};
export default ChatForm;
