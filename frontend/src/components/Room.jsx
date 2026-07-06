import { useEffect, useState, useCallback } from "react";
import socket from "../socket/socket";
import VideoPlayer from "./VideoPlayer";
import ParticipantList from "./ParticipantList";
import Chat from "./Chat";

const ROLE_COLORS = { host: "#f85149", moderator: "#e67e00", participant: "#3fb950" };
const ROLE_BG     = { host: "rgba(248,81,73,0.15)", moderator: "rgba(230,126,0,0.15)", participant: "rgba(63,185,80,0.15)" };

export default function Room({ room: initialRoom, onLeave }) {
  const [room,        setRoom]       = useState(initialRoom);
  const [kicked,      setKicked]     = useState(false);
  const [leaving,     setLeaving]    = useState(false);
  const [sidebarTab,  setSidebarTab] = useState("chat");
  const [unreadCount, setUnread]     = useState(0);
  // On small screens the sidebar slides up as a panel
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const me           = room.participants.find((p) => p.socketId === socket.id);
  const myRole       = me?.role || "participant";
  const isController = myRole === "host" || myRole === "moderator";

  useEffect(() => {
    socket.on("user_joined",         (d) => setRoom((p) => ({ ...p, participants: d.participants })));
    socket.on("user_left",           (d) => setRoom((p) => ({ ...p, participants: d.participants })));
    socket.on("role_assigned",       (d) => setRoom((p) => ({ ...p, participants: d.participants })));
    socket.on("participant_removed", (d) => setRoom((p) => ({ ...p, participants: d.participants })));
    socket.on("host_transferred",    (r) => { if (r.success) setRoom((p) => ({ ...p, participants: r.data.participants })); });
    socket.on("kicked", () => setKicked(true));
    return () => ["user_joined","user_left","role_assigned","participant_removed","host_transferred","kicked"].forEach((e) => socket.off(e));
  }, []);

  // Clear unread when switching to chat — done in the click handler, not an effect
  const switchSidebarTab = useCallback((key) => {
    setSidebarTab(key);
    if (key === "chat") setUnread(0);
  }, []);

  const handleLeave = () => {
    setLeaving(true);
    socket.emit("leave_room", { roomCode: room.roomCode }, () => onLeave());
  };

  const handleVideoUpdate = useCallback((v) => setRoom((p) => ({ ...p, video: v })), []);
  const handleUnread = useCallback(() => {
    setSidebarTab((tab) => {
      if (tab !== "chat") setUnread((n) => n + 1);
      return tab;
    });
  }, []);

  if (kicked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", textAlign: "center", padding: "clamp(16px,4vw,32px)" }}>
        <div style={{ fontSize: "clamp(40px,8vw,64px)" }}>🚫</div>
        <h2 style={{ fontSize: "clamp(18px,4vw,24px)", fontWeight: 700 }}>You've been removed</h2>
        <p style={{ color: "var(--text2)", fontSize: "clamp(13px,2vw,15px)" }}>The host or a moderator removed you from this watch party.</p>
        <button onClick={onLeave} style={{ ...btnDanger, padding: "12px 28px", fontSize: "15px" }}>Back to Home</button>
      </div>
    );
  }

  const sidebarContent = (
    <>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {[{ key: "participants", label: "Participants", badge: null }, { key: "chat", label: "Chat", badge: unreadCount }].map(({ key, label, badge }) => (
          <button key={key} onClick={() => switchSidebarTab(key)} style={{
            flex: 1, padding: "12px 8px", background: "transparent", border: "none",
            borderBottom: sidebarTab === key ? "2px solid var(--accent)" : "2px solid transparent",
            color: sidebarTab === key ? "var(--text)" : "var(--text2)",
            fontWeight: 600, fontSize: "clamp(12px,2vw,13px)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}>
            {label}
            {badge > 0 && <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "10px", fontSize: "10px", fontWeight: 700, padding: "1px 6px" }}>{badge > 99 ? "99+" : badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: sidebarTab === "participants" ? "flex" : "none", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <ParticipantList participants={room.participants} myRole={myRole} roomCode={room.roomCode} />
          </div>
        </div>
        <div style={{ display: sidebarTab === "chat" ? "flex" : "none", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <Chat roomCode={room.roomCode} me={me} onUnread={handleUnread} />
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <header style={{
        width: "100%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(10px,2vw,20px)", height: "clamp(48px,7vw,56px)",
        background: "var(--bg2)", borderBottom: "1px solid var(--border)", zIndex: 50,
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,16px)", minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: "clamp(13px,2.5vw,16px)", whiteSpace: "nowrap" }}>🎬 WatchParty</span>
          <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span style={{ fontSize: "11px", color: "var(--text2)", flexShrink: 0 }}>Room</span>
            <code style={{
              background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "6px",
              padding: "2px clamp(6px,1.5vw,10px)", fontSize: "clamp(11px,2vw,13px)",
              fontWeight: 700, letterSpacing: "1px", color: "var(--accent)", whiteSpace: "nowrap",
            }}>{room.roomCode}</code>
            <button onClick={() => navigator.clipboard.writeText(room.roomCode)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: "14px", padding: "2px", flexShrink: 0 }}>📋</button>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px,1.5vw,12px)", flexShrink: 0 }}>
          <span style={{ fontSize: "clamp(11px,1.8vw,13px)", color: "var(--text2)" }}>👥 {room.participants.length}</span>
          <span style={{
            background: ROLE_BG[myRole], color: ROLE_COLORS[myRole],
            border: `1px solid ${ROLE_COLORS[myRole]}`,
            padding: "2px clamp(6px,1.5vw,10px)", borderRadius: "20px",
            fontSize: "clamp(10px,1.6vw,12px)", fontWeight: 700, textTransform: "uppercase",
          }}>{myRole}</span>
          {/* Toggle sidebar button — visible on small screens */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: sidebarOpen ? "var(--accent)" : "var(--bg3)", border: "1px solid var(--border)", borderRadius: "8px", padding: "5px 10px", cursor: "pointer", fontSize: "14px", color: sidebarOpen ? "#fff" : "var(--text2)" }}>
            💬{unreadCount > 0 && !sidebarOpen ? ` ${unreadCount}` : ""}
          </button>
          <button onClick={handleLeave} disabled={leaving}
            style={leaving ? { ...btnDanger, opacity: 0.5, cursor: "not-allowed" } : btnDanger}>
            {leaving ? "…" : "Leave"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* Video panel — always visible, takes remaining width */}
        <main style={{ flex: 1, padding: "clamp(10px,2vw,20px)", overflowY: "auto", minWidth: 0 }}>
          <VideoPlayer
            roomCode={room.roomCode}
            video={room.video || { videoId: "", currentTime: 0, isPlaying: false }}
            isController={isController}
            onVideoUpdate={handleVideoUpdate}
          />
        </main>

        {/* Sidebar — fixed 300px on large screens, full overlay on small screens.
            Uses a CSS clamp trick: width clamp(0px,30vw,320px) so it naturally
            disappears when viewport is narrow, and the toggle shows a sheet instead. */}
        <aside style={{
          /* On wide screens: inline sidebar */
          width: "clamp(0px,35vw,320px)",
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--bg2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.2s",
        }}>
          {sidebarContent}
        </aside>

        {/* Mobile overlay panel — shown when sidebarOpen on narrow screens */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div onClick={() => setSidebarOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
            {/* Sheet slides up from bottom */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: "70%", background: "var(--bg2)",
              borderTop: "1px solid var(--border)", borderRadius: "16px 16px 0 0",
              zIndex: 101, display: "flex", flexDirection: "column",
              animation: "slideUp 0.2s ease",
            }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "10px", flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              {sidebarContent}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const btnDanger = {
  background: "rgba(248,81,73,0.15)", color: "var(--red)",
  border: "1px solid rgba(248,81,73,0.3)",
  borderRadius: "8px", padding: "5px clamp(8px,1.5vw,14px)",
  fontSize: "clamp(11px,1.8vw,13px)", fontWeight: 600, cursor: "pointer",
};
