import { useEffect, useState } from "react";
import "./App.css";
import socket from "./socket/socket";
import LandingPage from "./components/LandingPage";
import Room from "./components/Room";

function App() {
  const [room,             setRoom]             = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    socket.connect();
    socket.on("connect",    () => setConnectionStatus("connected"));
    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, []);

  if (room) return <Room room={room} onLeave={() => setRoom(null)} />;

  return (
    <LandingPage
      connectionStatus={connectionStatus}
      onRoomJoined={setRoom}
    />
  );
}

export default App;
