import { useState } from "react";
import { useChat } from "./context/UseChat";
const Chatbot = (props) => {
  const { showChatbot, setShowChatbot } = useChat();
  return (
    <div className={`container ${showChatbot ? "show-chatbot" : ""}`}>
      <button
        onClick={() => setShowChatbot((prev) => !prev)}
        id="chatbot-toggler"
      >
        {!showChatbot ? (
          <svg
            width="28"
            height="28"
            viewBox="0 0 100 100"
            fill="none"
            role="img"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <filter id="33c9df204aeec9aa096f1fd360bd4160">
              <feGaussianBlur
                stdDeviation="0,4"
                in="SourceAlpha"
              ></feGaussianBlur>
              <feOffset dx="0" dy="4" result="offsetblur"></feOffset>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"></feFuncA>
              </feComponentTransfer>
              <feComposite operator="in" in2="offsetblur"></feComposite>
              <feMerge>
                <feMergeNode></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
            <path
              fill="#fff"
              filter="#33c9df204aeec9aa096f1fd360bd4160"
              d="M50,0C22.4,0,0,22.4,0,50s22.4,50,50,50h30.8l0-10.6C92.5,80.2,100,66,100,50C100,22.4,77.6,0,50,0z M32,54.5 c-2.5,0-4.5-2-4.5-4.5c0-2.5,2-4.5,4.5-4.5s4.5,2,4.5,4.5C36.5,52.5,34.5,54.5,32,54.5z M50,54.5c-2.5,0-4.5-2-4.5-4.5 c0-2.5,2-4.5,4.5-4.5c2.5,0,4.5,2,4.5,4.5C54.5,52.5,52.5,54.5,50,54.5z M68,54.5c-2.5,0-4.5-2-4.5-4.5c0-2.5,2-4.5,4.5-4.5 s4.5,2,4.5,4.5C72.5,52.5,70.5,54.5,68,54.5z"
            ></path>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            fill="none"
            role="img"
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
            <path
              fill="#fff"
              d="M8.12 9.29 12 13.17l3.88-3.88a.996.996 0 1 1 1.41 1.41l-4.59 4.59a.996.996 0 0 1-1.41 0L6.7 10.7a.996.996 0 0 1 0-1.41c.39-.38 1.03-.39 1.42 0Z"
            ></path>
          </svg>
        )}
      </button>
      {props.children}
    </div>
  );
};

export default Chatbot;
