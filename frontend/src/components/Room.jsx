import { useEffect, useState, useCallback } from "react";
import socket from "../socket/socket";
import VideoPlayer from "./VideoPlayer";
import ParticipantList from "./ParticipantList";
import Chat from "./Chat";

const ROLE_COLORS = { host: "#f85149", moderator: "#e67e00", participant: "#3fb950" };
const ROLE_BG     = { host: "rgba(248,81,73,0.15)", moderator: "rgba(230,126,0,0.15)", participant: "rgba(63,185,80,0.15)" };

export default function Room({ room: initialRoom, onLeave }) {
  const [room,        setRoom]        = useState(initialRoom);
  const [kicked,      setKicked]      = useState(false);
  const [leaving,     setLeaving]     = useState(false);
  const [sidebarTab,  setSidebarTab]  = useState("chat");
  const [unreadCount, setUnread]      = useState(0);
  const [sheetOpen,   setSheetOpen]   = useState(false);

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
    return () => ["user_joined","user_left","role_assigned","participant_removed","host_transferred","kicked"]
      .forEach((e) => socket.off(e));
  }, []);

  const switchTab = useCallback((key) => {
    setSidebarTab(key);
    if (key === "chat") setUnread(0);
  }, []);

  const openSheet = useCallback((key) => {
    setSidebarTab(key);
    if (key === "chat") setUnread(0);
    setSheetOpen(true);
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

  /* ── Kicked screen ── */
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

  /* ── Sidebar tab content (shared between desktop sidebar and mobile sheet) ── */
  const tabContent = (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ display: sidebarTab === "participants" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden" }}>
        <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
          <ParticipantList participants={room.participants} myRole={myRole} roomCode={room.roomCode} />
        </div>
      </div>
      <div style={{ display: sidebarTab === "chat" ? "flex" : "none", flexDirection:"column", flex:1, overflow:"hidden" }}>
        <Chat roomCode={room.roomCode} me={me} onUnread={handleUnread} />
      </div>
    </div>
  );

  const tabBar = (inSheet = false) => (
    <div style={{ display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
      {[
        { key:"chat",         label:"💬 Chat",         badge: unreadCount },
        { key:"participants", label:"👥 Participants",  badge: null },
      ].map(({ key, label, badge }) => (
        <button key={key}
          onClick={() => inSheet ? switchTab(key) : switchTab(key)}
          style={{
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
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", width:"100%", background:"var(--bg)", overflow:"hidden" }}>

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <header style={{
        width:"100%", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 14px", height:"52px",
        background:"var(--bg2)", borderBottom:"1px solid var(--border)", zIndex:50,
      }}>
        {/* Left: logo + room code */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
          <span style={{ fontWeight:800, fontSize:"15px", whiteSpace:"nowrap" }}>🎬</span>
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

        {/* Right: role + leave */}
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
            cursor: leaving ? "not-allowed" : "pointer",
            opacity: leaving ? 0.5 : 1,
          }}>
            {leaving ? "…" : "Leave"}
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════
          BODY  (desktop: row | mobile: column)
      ════════════════════════════════════════ */}
      <div className="room-body" style={{ flex:1, overflow:"hidden", position:"relative" }}>

        {/* ── Video panel ── */}
        <main className="room-video" style={{ overflowY:"auto", minWidth:0 }}>
          <VideoPlayer
            roomCode={room.roomCode}
            video={room.video || { videoId:"", currentTime:0, isPlaying:false }}
            isController={isController}
            onVideoUpdate={handleVideoUpdate}
          />
        </main>

        {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
        <aside className="room-sidebar">
          {tabBar(false)}
          {tabContent}
        </aside>

        {/* ── Mobile bottom sheet ── */}
        {sheetOpen && (
          <>
            <div onClick={() => setSheetOpen(false)}
              style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200 }} />
            <div className="room-sheet">
              {/* drag handle */}
              <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px", flexShrink:0 }}>
                <div style={{ width:40, height:4, borderRadius:2, background:"var(--border)" }} />
              </div>
              {tabBar(true)}
              {tabContent}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAV BAR
          (hidden on desktop via CSS)
      ════════════════════════════════════════ */}
      <nav className="room-bottom-nav">
        <button onClick={() => openSheet("chat")} style={navBtn}>
          <span style={{ fontSize:"20px" }}>💬</span>
          <span style={{ fontSize:"10px", fontWeight:600 }}>Chat</span>
          {unreadCount > 0 && (
            <span style={{
              position:"absolute", top:6, right:"calc(50% - 22px)",
              background:"var(--accent)", color:"#fff",
              borderRadius:"10px", fontSize:"9px", fontWeight:700,
              padding:"1px 5px", minWidth:16, textAlign:"center",
            }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>
        <button onClick={() => openSheet("participants")} style={navBtn}>
          <span style={{ fontSize:"20px" }}>👥</span>
          <span style={{ fontSize:"10px", fontWeight:600 }}>
            {room.participants.length} People
          </span>
        </button>
        <button onClick={handleLeave} disabled={leaving} style={{
          ...navBtn,
          color:"var(--red)",
          opacity: leaving ? 0.5 : 1,
        }}>
          <span style={{ fontSize:"20px" }}>🚪</span>
          <span style={{ fontSize:"10px", fontWeight:600 }}>{leaving ? "…" : "Leave"}</span>
        </button>
      </nav>

      {/* ════════════════════════════════════════
          RESPONSIVE STYLES
      ════════════════════════════════════════ */}
      <style>{`
        /* ── Desktop (≥ 700px): side-by-side layout ── */
        .room-body {
          display: flex;
          flex-direction: row;
        }
        .room-video {
          flex: 1;
          padding: 20px;
        }
        .room-sidebar {
          width: 300px;
          flex-shrink: 0;
          border-left: 1px solid var(--border);
          background: var(--bg2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .room-sheet  { display: none; }
        .room-bottom-nav { display: none; }

        /* ── Mobile (< 700px): stacked layout ── */
        @media (max-width: 699px) {
          .room-body {
            flex-direction: column;
            overflow-y: auto;
          }
          .room-video {
            flex: none;
            padding: 12px 12px 8px;
          }
          .room-sidebar {
            display: none !important;
          }
          /* bottom sheet */
          .room-sheet {
            display: flex;
            flex-direction: column;
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 72%;
            background: var(--bg2);
            border-top: 1px solid var(--border);
            border-radius: 18px 18px 0 0;
            z-index: 201;
            animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            overflow: hidden;
          }
          /* bottom nav bar */
          .room-bottom-nav {
            display: flex;
            flex-shrink: 0;
            background: var(--bg2);
            border-top: 1px solid var(--border);
            height: 60px;
          }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const navBtn = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "3px",
  background: "transparent",
  border: "none",
  color: "var(--text2)",
  cursor: "pointer",
  position: "relative",
  padding: "8px 4px",
};
