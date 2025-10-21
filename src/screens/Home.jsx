import { useMemo } from "react";
import logo from "../assets/logo_white.webp";
import HelpMenu from "../components/HelpMenu";
import Chatbot from "../Chatbot";
import { useChat } from "../context/UseChat";

const Home = () => {
  const { showChatbot, setShowChatbot } = useChat();


  const defaultItems = useMemo(
    () => [
      {
        id: "gpt_chat",
        label: "Chat with Nfinity GPT",
        highlight: true,
        ChatHistory: [], // ← empty: no default model greeting
      },
      {
        id: "recommend",
        label: "Product recommendations",
        ChatHistory: [
          {
            role: "user",
            text: "Requesting product recommendations.",
            id: "recommend",
            time: new Date().toLocaleTimeString(),
            isProductRecommendation: false,
          },
        ],
      },
      {
        id: "sizing",
        label: "Sizing & fit guide",
        ChatHistory: [
          {
            role: "user",
            text: "Seeking sizing and fit guidance.",
            id: "sizing",
            time: new Date().toLocaleTimeString(),
            isProductRecommendation: false,
          },
        ],
      },
      {
        id: "returns",
        label: "Returns & exchanges",
        ChatHistory: [
          {
            role: "user",
            text: "Assistance with returns and exchanges.",
            id: "returns",
            time: new Date().toLocaleTimeString(),
            isProductRecommendation: false,
          },
        ],
      },
      {
        id: "feedback",
        label: "Help us improve the website",
        ChatHistory: [
          {
            role: "user",
            text: "Website feedback and issues.",
            id: "feedback",
            time: new Date().toLocaleTimeString(),
            isProductRecommendation: false,
          },
        ],
      },
    ],
    []
  );

  const trackItems = useMemo(
    () => [
      {
        id: "track_orders",
        label: "Track and manage my orders",
        ChatHistory: [
          {
            role: "user",
            text: "Track and manage my orders",
            id: "track_orders",
            time: new Date().toLocaleTimeString(),
            isProductRecommendation: false,
          },
        ],
        badge: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Package icon"
          >
            <path
              d="M11.9311 3.08561C11.7334 2.97146 11.4129 2.97146 11.2152 3.08561L4.77137 6.80594C4.57365 6.92009 4.57365 7.10516 4.77137 7.21931L7.27729 8.66611C7.37614 8.72318 7.53642 8.72318 7.63528 8.66611L14.4371 4.73909C14.5359 4.68202 14.5359 4.58948 14.4371 4.53241L11.9311 3.08561Z"
              fill="#000000ff"
            />
            <path
              d="M15.869 5.35915C15.7702 5.30207 15.6099 5.30207 15.511 5.35915L8.70924 9.28616C8.61039 9.34324 8.61039 9.43577 8.70924 9.49285L11.2152 10.9396C11.4129 11.0538 11.7334 11.0538 11.9311 10.9396L18.3749 7.21931C18.5727 7.10516 18.5727 6.92009 18.3749 6.80594L15.869 5.35915Z"
              fill="#000000ff"
            />
            <path
              d="M11.9865 12.3038C11.9865 12.0755 12.1468 11.7979 12.3445 11.6837L18.7883 7.96338C18.986 7.84923 19.1463 7.94176 19.1463 8.17006V15.6107C19.1463 15.839 18.986 16.1166 18.7883 16.2308L12.3445 19.9511C12.1468 20.0653 11.9865 19.9727 11.9865 19.7444V12.3038Z"
              fill="#000000ff"
            />
            <path
              d="M4 8.17006C4 7.94176 4.16028 7.84923 4.35799 7.96338L6.86391 9.41017C6.96277 9.46725 7.04291 9.60605 7.04291 9.7202V11.3737C7.04291 11.4878 7.12304 11.6266 7.2219 11.6837L7.93788 12.0971C8.03673 12.1542 8.11687 12.1079 8.11687 11.9937V10.3403C8.11687 10.2261 8.19701 10.1798 8.29587 10.2369L10.8018 11.6837C10.9995 11.7979 11.1598 12.0755 11.1598 12.3038V19.7444C11.1598 19.9727 10.9995 20.0653 10.8018 19.9511L4.35799 16.2308C4.16028 16.1166 4 15.839 4 15.6107L4 8.17006Z"
              fill="#000000ff"
            />
          </svg>
        ),
      },
    ],
    []
  );

  const handleMinimize = () => setShowChatbot(false);

  return (
    <Chatbot showChatbot={showChatbot} setShowChatbot={setShowChatbot}>
      <div className="chatbot-popup">
        <div className="chat-header">
          <div className="header-info ml-3 lg:ml-0">
            <img src={logo} width="140" height="24" alt="Nfinity Logo" />
          </div>
          <button
            onClick={handleMinimize}
            className="material-symbols-rounded"
            aria-label="Minimize chat"
            type="button"
          >
            keyboard_arrow_down
          </button>
        </div>

        <div className="chat-body-still">
          <div className="chat-body-text-block">
            <h2>How can we help?</h2>
            <p>Ask anything, or start with a popular topic.</p>
          </div>

          <HelpMenu items={defaultItems} />
          <HelpMenu items={trackItems} />
        </div>
      </div>
    </Chatbot>
  );
};

export default Home;
