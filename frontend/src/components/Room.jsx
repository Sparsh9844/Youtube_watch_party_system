import { useEffect, useState, useCallback } from "react";
import socket from "../socket/socket";
import VideoPlayer from "./VideoPlayer";
import ParticipantList from "./ParticipantList";
import Chat from "./Chat";
import { ToastProvider, useToast } from "./Toast";

const ROLE_COLORS = { host: "#f85149", moderator: "#e67e00", participant: "#3fb950" };
const ROLE_BG     = { host: "rgba(248,81,73,0.15)", moderator: "rgba(230,126,0,0.15)", participant: "rgba(63,185,80,0.15)" };

function RoomInner({ room: initialRoom, onLeave }) {
  const { toast } = useToast();
  const [room,        setRoom]       = useState(initialRoom);
  const [kicked,      setKicked]     = useState(false);
  const [leaving,     setLeaving]    = useState(false);
  const [activeTab,   setActiveTab]  = useState("video"); // "video" | "chat" | "participants"
  const [unreadCount, setUnread]     = useState(0);
  // desktop sidebar tab
  const [sidebarTab,  setSidebarTab] = useState("chat");
  const [isMobile,    setIsMobile]   = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 699px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const me           = room.participants.find((p) => p.socketId === socket.id);
  const myRole       = me?.role || "participant";
  const isController = myRole === "host" || myRole === "moderator";

  // ─── Socket events ─────────────────────────────────────────
  useEffect(() => {
    socket.on("user_joined", (d) => {
      setRoom((p) => ({ ...p, participants: d.participants }));
      if (d.userId !== socket.id) toast(`👋 ${d.username} joined the room`, "info");
    });
    socket.on("user_left", (d) => {
      setRoom((p) => ({ ...p, participants: d.participants }));
      toast(`🚶 ${d.username} left the room`, "warn");
    });
    socket.on("role_assigned", (d) => {
      setRoom((p) => ({ ...p, participants: d.participants }));
      if (d.userId === socket.id) {
        const label = d.role === "host"      ? "🎉 You are now the Host!"
          : d.role === "moderator" ? "🛡️ You've been made a Moderator"
          : "👤 Your role is now Participant";
        toast(label, d.role === "host" ? "success" : d.role === "moderator" ? "info" : "warn");
      }
    });
    socket.on("participant_removed", (d) => setRoom((p) => ({ ...p, participants: d.participants })));
    socket.on("host_transferred", (r) => {
      if (!r.success) return;
      setRoom((p) => ({ ...p, participants: r.data.participants }));
      if (r.data.newHostId === socket.id) toast("🎉 You are now the Host!", "success");
    });
    socket.on("kicked", () => setKicked(true));
    return () => ["user_joined","user_left","role_assigned","participant_removed","host_transferred","kicked"]
      .forEach((e) => socket.off(e));
  }, [toast]);

  // ─── Handlers ──────────────────────────────────────────────
  const switchMobileTab = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === "chat") setUnread(0);
  }, []);

  const switchDesktopTab = useCallback((key) => {
    setSidebarTab(key);
    if (key === "chat") setUnread(0);
  }, []);

  const handleLeave = () => {
    setLeaving(true);
    socket.emit("leave_room", { roomCode: room.roomCode }, () => onLeave());
  };

  const handleVideoUpdate = useCallback((v) => setRoom((p) => ({ ...p, video: v })), []);

  const videoPlayer = (
    <VideoPlayer
      roomCode={room.roomCode}
      video={room.video || { videoId:"", currentTime:0, isPlaying:false }}
      isController={isController}
      onVideoUpdate={handleVideoUpdate}
    />
  );

  const handleUnread = useCallback(() => {
    const chatVisible = isMobile
      ? activeTab === "chat"
      : sidebarTab === "chat";
    if (!chatVisible) setUnread((n) => n + 1);
  }, [isMobile, activeTab, sidebarTab]);

  const chatPanel = (
    <Chat roomCode={room.roomCode} me={me} onUnread={handleUnread} />
  );

  // ─── Kicked screen ──────────────────────────────────────────
  if (kicked) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px", textAlign:"center", padding:"24px", background:"var(--bg)" }}>
        <div style={{ fontSize:"56px" }}>🚫</div>
        <h2 style={{ fontSize:"22px", fontWeight:700 }}>You've been removed</h2>
        <p style={{ color:"var(--text2)", fontSize:"14px" }}>The host or moderator removed you from this watch party.</p>
        <button onClick={onLeave} style={{ background:"var(--red)", color:"#fff", border:"none", borderRadius:"10px", padding:"12px 28px", fontWeight:700, fontSize:"15px", cursor:"pointer" }}>
          Back to Home
        </button>
      </div>
    );
  }

  const panelContent = null; // kept as placeholder — content rendered inline below

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", width:"100%", background:"var(--bg)", overflow:"hidden" }}>

      {/* ════════ TOP BAR ════════ */}
      <header style={{
        width:"100%", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 14px", height:"52px",
        background:"var(--bg2)", borderBottom:"1px solid var(--border)", zIndex:50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
          <span style={{ fontWeight:800, fontSize:"15px" }}>🎬</span>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", minWidth:0 }}>
            <code style={{
              background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"6px",
              padding:"3px 10px", fontSize:"13px", fontWeight:700, letterSpacing:"1.5px",
              color:"var(--accent)", whiteSpace:"nowrap",
            }}>{room.roomCode}</code>
            <button onClick={() => navigator.clipboard.writeText(room.roomCode)}
              title="Copy room code"
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:"15px", padding:"2px", flexShrink:0 }}>
              📋
            </button>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
          <span style={{
            background:ROLE_BG[myRole], color:ROLE_COLORS[myRole],
            border:`1px solid ${ROLE_COLORS[myRole]}`,
            padding:"3px 10px", borderRadius:"20px",
            fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px",
          }}>{myRole}</span>
          <button onClick={handleLeave} disabled={leaving} style={{
            background:"rgba(248,81,73,0.12)", color:"var(--red)",
            border:"1px solid rgba(248,81,73,0.3)", borderRadius:"8px",
            padding:"6px 14px", fontSize:"13px", fontWeight:600,
            cursor: leaving ? "not-allowed" : "pointer", opacity: leaving ? 0.5 : 1,
          }}>
            {leaving ? "…" : "Leave"}
          </button>
        </div>
      </header>

      {/* ════════ DESKTOP BODY (≥700px) ════════ */}
      <div className="desktop-body">
        <main className="desktop-video">
          {!isMobile && videoPlayer}
        </main>
        <aside className="desktop-sidebar">
          {/* Desktop tab bar */}
          <div style={{ display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            {[
              { key:"chat",         label:"💬 Chat",        badge: unreadCount },
              { key:"participants", label:"👥 Participants", badge: null },
            ].map(({ key, label, badge }) => (
              <button key={key} onClick={() => switchDesktopTab(key)} style={{
                flex:1, padding:"13px 8px", background:"transparent", border:"none",
                borderBottom: sidebarTab === key ? "2px solid var(--accent)" : "2px solid transparent",
                color: sidebarTab === key ? "var(--text)" : "var(--text2)",
                fontWeight:600, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
              }}>
                {label}
                {badge > 0 && (
                  <span style={{ background:"var(--accent)", color:"#fff", borderRadius:"10px", fontSize:"10px", fontWeight:700, padding:"1px 7px", minWidth:18, textAlign:"center" }}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Desktop panel content */}
          <div style={{ flex:1, minHeight:0, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
            <div style={{ display: sidebarTab === "participants" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden" }}>
              <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
                <ParticipantList participants={room.participants} myRole={myRole} roomCode={room.roomCode} />
              </div>
            </div>
            <div style={{ display: sidebarTab === "chat" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden", minHeight:0 }}>
              {!isMobile && chatPanel}
            </div>
          </div>
        </aside>
      </div>

      {/* ════════ MOBILE BODY (<700px) ════════
          Layout: video strip → tab bar → content panel
          Everything fits in 100dvh — no scrolling
      ════════ */}
      <div className="mobile-body">

        {/* Video strip — fixed 16:9 aspect */}
        <div className="mobile-video">
          {isMobile && videoPlayer}
        </div>

        {/* Tab switcher */}
        <div className="mobile-tabs">
          {[
            { key:"video",        emoji:"▶",  label:"Video" },
            { key:"chat",         emoji:"💬", label:"Chat",  badge: unreadCount },
            { key:"participants", emoji:"👥", label:`People (${room.participants.length})` },
          ].map(({ key, emoji, label, badge }) => (
            <button key={key} onClick={() => switchMobileTab(key)} style={{
              flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:"2px",
              background:"transparent", border:"none",
              borderBottom: activeTab === key ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === key ? "var(--text)" : "var(--text2)",
              fontWeight: activeTab === key ? 700 : 500,
              fontSize:"11px", cursor:"pointer", padding:"8px 4px",
              position:"relative",
            }}>
              <span style={{ fontSize:"18px" }}>{emoji}</span>
              <span>{label}</span>
              {badge > 0 && (
                <span style={{
                  position:"absolute", top:4, right:"calc(50% - 18px)",
                  background:"var(--accent)", color:"#fff",
                  borderRadius:"10px", fontSize:"9px", fontWeight:700,
                  padding:"1px 5px", minWidth:15, textAlign:"center",
                }}>{badge > 99 ? "99+" : badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content panel — fills all remaining space */}
        <div className="mobile-panel">
          {/* Video panel (just shows a "watching video" note when active) */}
          {activeTab === "video" && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text2)", fontSize:"13px" }}>
              ↑ Video is playing above
            </div>
          )}
          {/* Chat panel */}
          <div style={{ display: activeTab === "chat" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden", minHeight:0 }}>
            {isMobile && chatPanel}
          </div>
          {/* Participants panel */}
          <div style={{ display: activeTab === "participants" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
              <ParticipantList participants={room.participants} myRole={myRole} roomCode={room.roomCode} />
            </div>
          </div>
        </div>
      </div>

      {/* ════════ RESPONSIVE CSS ════════ */}
      <style>{`
        /* ── DESKTOP ≥ 700px ── */
        .desktop-body {
          display: flex;
          flex-direction: row;
          flex: 1;
          overflow: hidden;
        }
        .desktop-video {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          min-width: 0;
        }
        .desktop-sidebar {
          width: 300px;
          flex-shrink: 0;
          border-left: 1px solid var(--border);
          background: var(--bg2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        /* Hide mobile layout on desktop */
        .mobile-body  { display: none; }

        /* ── MOBILE < 700px ── */
        @media (max-width: 699px) {
          /* Hide desktop layout */
          .desktop-body { display: none; }

          /* Mobile layout fills the rest of the viewport after the header */
          .mobile-body {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            min-height: 0;
          }

          /* Video strip — fixed 16:9, never taller than 38% of viewport */
          .mobile-video {
            flex-shrink: 0;
            width: 100%;
            max-height: 38dvh;
            padding: 8px 8px 0;
            background: #000;
          }

          /* Tab bar */
          .mobile-tabs {
            display: flex;
            flex-shrink: 0;
            background: var(--bg2);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
          }

          /* Panel fills everything below tab bar */
          .mobile-panel {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--bg2);
          }
        }
      `}</style>
    </div>
  );
}

export default function Room(props) {
  return (
    <ToastProvider>
      <RoomInner {...props} />
    </ToastProvider>
  );
}
