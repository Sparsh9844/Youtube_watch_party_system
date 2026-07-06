import socket from "../socket/socket";

const ROLE_COLORS = { host: "#f85149", moderator: "#e67e00", participant: "#8b949e" };
const ROLE_BG     = { host: "rgba(248,81,73,0.15)", moderator: "rgba(230,126,0,0.15)", participant: "rgba(139,148,158,0.1)" };
const ROLE_LABELS = { host: "Host", moderator: "Mod", participant: "Viewer" };

function ParticipantList({ participants, myRole, roomCode }) {
  const mySocketId  = socket.id;
  const isHost      = myRole === "host";
  const isModerator = myRole === "moderator";

  const handleAssignRole = (targetSocketId, newRole) => {
    socket.emit("assign_role", { roomCode, targetSocketId, newRole }, (res) => {
      if (!res.success) alert(res.message);
    });
  };

  const handleRemove = (targetSocketId, username) => {
    if (!window.confirm(`Remove ${username} from the room?`)) return;
    socket.emit("remove_participant", { roomCode, targetSocketId }, (res) => {
      if (!res.success) alert(res.message);
    });
  };

  const handleTransferHost = (targetSocketId, username) => {
    if (!window.confirm(`Transfer host to ${username}?`)) return;
    socket.emit("transfer_host", { roomCode, targetSocketId }, (res) => {
      if (!res.success) alert(res.message);
    });
  };

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
      {participants.map((p) => {
        const isMe             = p.socketId === mySocketId;
        const isTargetHost     = p.role === "host";
        const isTargetMod      = p.role === "moderator";
        const isTargetViewer   = p.role === "participant";
        const showHostActions  = isHost && !isMe && !isTargetHost;
        const showModActions   = isModerator && !isMe && isTargetViewer;

        // Avatar letter + colour
        const avatarBg = isTargetHost ? "#f85149" : isTargetMod ? "#e67e00" : "#2f81f7";

        return (
          <li key={p.socketId} style={{
            borderRadius: "8px", padding: "8px 10px",
            background: isMe ? "rgba(47,129,247,0.08)" : "transparent",
            border: isMe ? "1px solid rgba(47,129,247,0.2)" : "1px solid transparent",
          }}>
            {/* Row 1: avatar + name + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                background: avatarBg, display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontSize: "13px", color: "#fff",
              }}>
                {p.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</span>
                  {isMe && <span style={{ fontSize: "10px", color: "var(--text2)", fontWeight: 400 }}>(you)</span>}
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px",
                  color: ROLE_COLORS[p.role], background: ROLE_BG[p.role],
                  padding: "1px 6px", borderRadius: "4px",
                }}>
                  {ROLE_LABELS[p.role] || p.role}
                </span>
              </div>
            </div>

            {/* Row 2: action buttons */}
            {(showHostActions || showModActions) && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px", paddingLeft: "38px" }}>
                {showHostActions && isTargetViewer && (
                  <button onClick={() => handleAssignRole(p.socketId, "moderator")} style={actionBtn("#e67e00")}>+ Mod</button>
                )}
                {showHostActions && isTargetMod && (
                  <button onClick={() => handleAssignRole(p.socketId, "participant")} style={actionBtn("#8b949e")}>- Mod</button>
                )}
                {showHostActions && (
                  <button onClick={() => handleTransferHost(p.socketId, p.username)} style={actionBtn("#2f81f7")}>Make Host</button>
                )}
                {(showHostActions || showModActions) && (
                  <button onClick={() => handleRemove(p.socketId, p.username)} style={actionBtn("#f85149")}>Remove</button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const actionBtn = (color) => ({
  padding: "2px 8px", fontSize: "11px", fontWeight: 600,
  background: "transparent", color: color,
  border: `1px solid ${color}`, borderRadius: "4px",
  cursor: "pointer", whiteSpace: "nowrap",
});

export default ParticipantList;
