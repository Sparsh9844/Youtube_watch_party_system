import { useState } from "react";
import socket from "../socket/socket";

const features = [
  { icon: "⚡", title: "Synchronized Play",  desc: "Play, pause, and seek together in perfect sync. Nobody falls behind." },
  { icon: "💬", title: "Live Chat",           desc: "React to moments together. Chat with everyone in your room in real time." },
  { icon: "🎭", title: "Role Management",     desc: "Host assigns moderators who can control playback and manage participants." },
  { icon: "🔗", title: "Instant Rooms",       desc: "No sign-up, no download. Create a room, share the code, start watching." },
  { icon: "🔒", title: "Access Control",      desc: "Remove participants and control who can interact with the room." },
  { icon: "📺", title: "YouTube Support",     desc: "Paste any YouTube URL and watch it together with perfect synchronisation." },
];

const steps = [
  { n: 1, label: "Enter your name" },
  { n: 2, label: "Create or join a room" },
  { n: 3, label: "Share the room code" },
  { n: 4, label: "Watch together!" },
];

const mockParticipants = [
  { name: "Sparsh", role: "Host",      color: "#2f81f7", badge: "LIVE" },
  { name: "Rahul",  role: "Moderator", color: "#e67e00", badge: null },
  { name: "Priya",  role: "Viewer",    color: "#8b5cf6", badge: null },
];

// Fluid inner wrapper — max 1200px, padding uses CSS var(--px)
const inner = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 var(--px)",
  width: "100%",
};

export default function LandingPage({ connectionStatus, onRoomJoined }) {
  const [tab,      setTab]      = useState("create");
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleCreate = () => {
    if (!username.trim()) return setError("Please enter a username");
    setError(""); setLoading(true);
    socket.emit("create_room", { username: username.trim() }, (res) => {
      setLoading(false);
      res.success ? onRoomJoined(res.data) : setError(res.message);
    });
  };

  const handleJoin = () => {
    if (!username.trim()) return setError("Please enter a username");
    if (!roomCode.trim()) return setError("Please enter a room code");
    setError(""); setLoading(true);
    socket.emit("join_room", { username: username.trim(), roomCode: roomCode.trim().toUpperCase() }, (res) => {
      setLoading(false);
      res.success ? onRoomJoined(res.data) : setError(res.message);
    });
  };

  const onKey = (e) => {
    if (e.key !== "Enter") return;
    tab === "create" ? handleCreate() : handleJoin();
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const dotColor = connectionStatus === "connected" ? "#3fb950"
    : connectionStatus === "connecting" ? "#e67e00" : "#f85149";
  const dotLabel = connectionStatus === "connected" ? "Connected"
    : connectionStatus === "connecting" ? "Connecting…" : "Disconnected";

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* ── Navbar ── */}
      <nav style={{
        width: "100%", borderBottom: "1px solid var(--border)",
        background: "rgba(13,17,23,0.92)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 200,
      }}>
        <div style={{ ...inner, display: "flex", alignItems: "center", justifyContent: "space-between", height: "clamp(52px,8vw,64px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "clamp(18px,4vw,24px)" }}>🎬</span>
            <span style={{ fontWeight: 800, fontSize: "clamp(15px,3vw,20px)", letterSpacing: "-0.5px" }}>WatchParty</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,16px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block", boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: "clamp(11px,2vw,13px)", color: "var(--text2)" }}>{dotLabel}</span>
            </div>
            <button onClick={() => scrollTo("get-started")} style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: "8px", padding: "clamp(6px,1.5vw,8px) clamp(12px,2.5vw,18px)",
              fontWeight: 600, fontSize: "clamp(12px,2vw,14px)", cursor: "pointer", whiteSpace: "nowrap",
            }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        width: "100%",
        background: "linear-gradient(160deg,#0d1117 0%,#0c1a3a 45%,#0d1117 100%)",
        borderBottom: "1px solid var(--border)",
        padding: "clamp(48px,8vw,100px) 0 clamp(40px,6vw,80px)",
      }}>
        <div style={{ ...inner, display: "flex", alignItems: "center", gap: "clamp(24px,5vw,64px)", flexWrap: "wrap" }}>

          {/* Left text */}
          <div style={{ flex: "1 1 min(460px,100%)", minWidth: 0 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "rgba(47,129,247,0.12)", border: "1px solid rgba(47,129,247,0.3)",
              borderRadius: "20px", padding: "4px 12px",
              fontSize: "clamp(10px,2vw,12px)", fontWeight: 600, color: "var(--accent)", marginBottom: "clamp(14px,3vw,24px)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
              No sign-up required · Free forever
            </div>

            <h1 style={{ fontSize: "clamp(28px,6vw,62px)", fontWeight: 800, lineHeight: 1.1, marginBottom: "clamp(12px,2.5vw,20px)", letterSpacing: "-1px" }}>
              Watch videos together<br />
              <span style={{ background: "linear-gradient(90deg,#2f81f7,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                with anyone, anywhere.
              </span>
            </h1>

            <p style={{ fontSize: "clamp(14px,2.5vw,18px)", color: "var(--text2)", lineHeight: 1.7, marginBottom: "clamp(24px,4vw,36px)", maxWidth: "520px" }}>
              Synchronized YouTube playback, live chat, and role-based controls — all in a single shareable room code.
            </p>

            <div style={{ display: "flex", gap: "clamp(8px,2vw,14px)", flexWrap: "wrap" }}>
              <button onClick={() => scrollTo("get-started")} style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "10px", padding: "clamp(10px,2vw,14px) clamp(18px,3vw,28px)",
                fontWeight: 700, fontSize: "clamp(13px,2vw,15px)", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(47,129,247,0.4)",
              }}>🚀 Create a Room</button>
              <button onClick={() => { setTab("join"); scrollTo("get-started"); }} style={{
                background: "transparent", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: "10px",
                padding: "clamp(10px,2vw,14px) clamp(18px,3vw,28px)",
                fontWeight: 600, fontSize: "clamp(13px,2vw,15px)", cursor: "pointer",
              }}>Enter Room Code →</button>
            </div>

            <div style={{ display: "flex", gap: "clamp(16px,4vw,32px)", marginTop: "clamp(24px,4vw,48px)", flexWrap: "wrap" }}>
              {[["∞","Free rooms"],["0","Sign-ups needed"],["<1s","Sync latency"]].map(([val, l]) => (
                <div key={l}>
                  <div style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: "clamp(10px,1.5vw,12px)", color: "var(--text2)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock card — hides on very small screens using min-width 0 flex shrink */}
          <div style={{ flex: "0 1 clamp(260px,35vw,380px)", minWidth: 0 }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
              <div style={{ background: "linear-gradient(135deg,#0d1117,#1a2744)", aspectRatio: "16/9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "clamp(40px,8vw,64px)", height: "clamp(40px,8vw,64px)", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(18px,4vw,28px)" }}>▶</div>
                <div style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(0,0,0,0.7)", borderRadius: "6px", padding: "2px 6px", fontSize: "10px", color: "#fff" }}>12:34 / 45:00</div>
                <div style={{ position: "absolute", top: 8, left: 10, background: "rgba(248,81,73,0.9)", borderRadius: "4px", padding: "2px 7px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>● LIVE</div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>{mockParticipants.length} watching</div>
                {mockParticipants.map((p) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>{p.name[0]}</div>
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{p.name}</span>
                    {p.badge && <span style={{ background: "rgba(63,185,80,0.15)", color: "var(--green)", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "5px", border: "1px solid var(--green)" }}>{p.badge}</span>}
                    <span style={{ fontSize: "11px", color: "var(--text2)" }}>{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ width: "100%", padding: "clamp(48px,7vw,96px) 0", background: "var(--bg)" }}>
        <div style={inner}>
          <div style={{ textAlign: "center", marginBottom: "clamp(32px,5vw,56px)" }}>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, marginBottom: "10px", letterSpacing: "-0.5px" }}>Everything you need</h2>
            <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "var(--text2)" }}>Built for seamless shared viewing experiences</p>
          </div>
          {/* auto-fit: min 200px → 1 col on mobile, 2 on tablet, 3 on desktop */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: "clamp(12px,2vw,20px)" }}>
            {features.map((f) => (
              <div key={f.title}
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "clamp(18px,3vw,28px)", transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s", cursor: "default" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(47,129,247,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
              >
                <div style={{ width: "clamp(36px,5vw,48px)", height: "clamp(36px,5vw,48px)", borderRadius: "12px", background: "rgba(47,129,247,0.12)", border: "1px solid rgba(47,129,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(18px,3vw,22px)", marginBottom: "14px" }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "clamp(13px,2vw,16px)", marginBottom: "6px" }}>{f.title}</div>
                <div style={{ fontSize: "clamp(12px,1.8vw,14px)", color: "var(--text2)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ width: "100%", padding: "clamp(48px,7vw,96px) 0", background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={inner}>
          <div style={{ textAlign: "center", marginBottom: "clamp(32px,5vw,56px)" }}>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, marginBottom: "10px", letterSpacing: "-0.5px" }}>How it works</h2>
            <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "var(--text2)" }}>Up and watching in under 30 seconds</p>
          </div>
          {/* auto-fit: 2 cols on mobile, 4 on desktop */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(140px,100%),1fr))", gap: "clamp(16px,3vw,24px)", position: "relative" }}>
            {steps.map((s) => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{ width: "clamp(36px,5vw,48px)", height: "clamp(36px,5vw,48px)", borderRadius: "50%", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: "clamp(14px,2.5vw,18px)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto clamp(10px,2vw,16px)", boxShadow: "0 0 0 6px rgba(47,129,247,0.15)" }}>{s.n}</div>
                <div style={{ fontWeight: 600, fontSize: "clamp(12px,2vw,15px)", color: "var(--text)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get Started Form ── */}
      <section id="get-started" style={{ width: "100%", padding: "clamp(48px,7vw,96px) 0", background: "var(--bg)" }}>
        <div style={{ ...inner, display: "flex", gap: "clamp(24px,5vw,64px)", alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Left copy */}
          <div style={{ flex: "1 1 min(320px,100%)", paddingTop: "8px" }}>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, marginBottom: "14px", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
              Ready to watch<br />together?
            </h2>
            <p style={{ fontSize: "clamp(13px,2vw,16px)", color: "var(--text2)", lineHeight: 1.7, marginBottom: "clamp(20px,3vw,32px)" }}>
              Create a room in seconds and share the code with your friends. No account, no download, no friction.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,2vw,16px)" }}>
              {[["🏠","Create a room","You become the host with full control"],["🔗","Join with a code","Enter the code your friend shared"],["🎬","Load a YouTube video","Paste any YouTube URL to start"]].map(([icon,title,desc]) => (
                <div key={title} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ width: "clamp(28px,4vw,36px)", height: "clamp(28px,4vw,36px)", borderRadius: "10px", flexShrink: 0, background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(13px,2vw,16px)" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "clamp(12px,2vw,14px)" }}>{title}</div>
                    <div style={{ fontSize: "clamp(11px,1.8vw,13px)", color: "var(--text2)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right form card */}
          <div style={{ flex: "1 1 min(320px,100%)", minWidth: 0 }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--shadow)" }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                {[["create","🏠 Create Room"],["join","🔗 Join Room"]].map(([t,label]) => (
                  <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
                    flex: 1, padding: "clamp(12px,2vw,16px)", border: "none", cursor: "pointer",
                    fontSize: "clamp(12px,2vw,14px)", fontWeight: 600, background: "transparent",
                    color: tab === t ? "var(--text)" : "var(--text2)",
                    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ padding: "clamp(20px,3vw,32px)" }}>
                <label style={lbl}>Your display name</label>
                <input type="text" placeholder="e.g. Sparsh" value={username}
                  onChange={(e) => setUsername(e.target.value)} onKeyDown={onKey}
                  style={inp} autoFocus />

                {tab === "join" && (
                  <div style={{ marginTop: "clamp(12px,2vw,16px)" }}>
                    <label style={lbl}>Room code</label>
                    <input type="text" placeholder="e.g. ABC123" value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())} onKeyDown={onKey}
                      style={{ ...inp, fontFamily: "monospace", letterSpacing: "3px", fontSize: "clamp(14px,2.5vw,16px)" }}
                      maxLength={8} />
                  </div>
                )}

                {error && (
                  <div style={{ background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "clamp(12px,2vw,13px)", color: "var(--red)", marginTop: "14px" }}>{error}</div>
                )}

                <button onClick={tab === "create" ? handleCreate : handleJoin} disabled={loading} style={{
                  width: "100%", marginTop: "clamp(16px,3vw,24px)",
                  background: loading ? "var(--border)" : "var(--accent)",
                  color: "#fff", border: "none", borderRadius: "10px",
                  padding: "clamp(11px,2vw,14px)", fontWeight: 700,
                  fontSize: "clamp(13px,2vw,15px)", cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(47,129,247,0.35)",
                }}>
                  {loading ? "Please wait…" : tab === "create" ? "Create Room →" : "Join Room →"}
                </button>

                <p style={{ textAlign: "center", fontSize: "clamp(11px,1.8vw,12px)", color: "var(--text2)", marginTop: "12px" }}>
                  No account required · Free to use
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ width: "100%", borderTop: "1px solid var(--border)", background: "var(--bg2)", padding: "clamp(20px,3vw,32px) 0" }}>
        <div style={{ ...inner, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🎬</span>
            <span style={{ fontWeight: 700, fontSize: "clamp(13px,2vw,15px)" }}>WatchParty</span>
          </div>
          <p style={{ fontSize: "clamp(11px,1.8vw,13px)", color: "var(--text2)" }}>Built with ❤️ — YouTube Watch Party System</p>
        </div>
      </footer>
    </div>
  );
}

const lbl = { display: "block", fontSize: "clamp(11px,1.8vw,13px)", fontWeight: 600, color: "var(--text2)", marginBottom: "6px" };
const inp = { width: "100%", padding: "clamp(10px,1.5vw,12px) clamp(10px,1.5vw,14px)", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "clamp(13px,2vw,14px)", outline: "none", transition: "border-color 0.15s" };
