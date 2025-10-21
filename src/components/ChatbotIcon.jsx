import logo from "../assets/logo_wo_text.png";

const ChatbotIcon = () => {
  return (
    <div className="chatBotIcon">
      <img src={logo} width="30px" height="30px" />
      {/* <span className="chatcard__status" aria-label="online" /> */}
    </div>
  );
};
export default ChatbotIcon;
