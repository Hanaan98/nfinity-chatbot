import Home from "./screens/Home";
import Chat from "./screens/Chat";
import { useChat } from "./context/UseChat";
const App = () => {
  const { view } = useChat();
  return view === "home" ? <Home /> : <Chat />;
};

export default App;
