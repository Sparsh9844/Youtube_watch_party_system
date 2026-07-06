import { useState, useEffect, useRef } from "react";
import socket from "../socket/socket";
import { useToast } from "./Toast";

const ROLE_COLORS = {
  host:        "#f85149",
  moderator:   "#e67e00",
  participant: "#2f81f7",
};

const ROLE_LABELS = {
  host:        "Host",
  moderator:   "Mod",
  participant: null, // don't show badge for plain participants
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Chat
 * Props:
 *  - roomCode : string
 *  - me       : { socketId, username, role }
 *  - onUnread : fn(count) — called when new messages arrive while tab is hidden
 */
export default function Chat({ roomCode, me, onUnread }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);
  const listRef   = useRef(null);

  // Track whether the chat panel is visible (parent toggles via CSS or mount)
  // We use a simple "auto-scroll unless user scrolled up" pattern.
  const isAtBottomRef = useRef(true);

  // ─── Load history on mount ────────────────────────────────────
  useEffect(() => {
    socket.emit("get_messages", { roomCode }, (res) => {
      if (res.success) setMessages(res.data);
    });
  }, [roomCode]);

  // ─── Listen for incoming messages ────────────────────────────
  useEffect(() => {
    const handleNew = (msg) => {
      setMessages((prev) => {
        // Deduplicate — socket.io can deliver the same event twice in StrictMode dev
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.userId !== socket.id) {
        onUnread?.();
      }
    };
    socket.on("new_message", handleNew);
    return () => socket.off("new_message", handleNew);
  }, [roomCode, onUnread]);

  // ─── Auto-scroll ─────────────────────────────────────────────
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // ─── Send ─────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    socket.emit("send_message", { roomCode, message: text }, (res) => {
      setSending(false);
      if (!res.success) toast(res.message, "error");
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--text2)", fontSize: "13px", gap: "8px", textAlign: "center",
            padding: "32px 16px",
          }}>
            <span style={{ fontSize: "32px" }}>💬</span>
            <span>No messages yet.<br />Say hi to start the conversation!</span>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe        = msg.userId === socket.id;
          const prevMsg     = messages[i - 1];
          const isContinued = prevMsg && prevMsg.userId === msg.userId;
          const roleColor   = ROLE_COLORS[msg.role] || "var(--text2)";
          const roleLabel   = ROLE_LABELS[msg.role];

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isMe ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: "8px",
                marginTop: isContinued ? "2px" : "10px",
              }}
            >
              {/* Avatar — only show on first message in a group */}
              {!isContinued ? (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: isMe ? "var(--accent)" : roleColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, color: "#fff",
                  alignSelf: "flex-end",
                }}>
                  {msg.username[0].toUpperCase()}
                </div>
              ) : (
                <div style={{ width: 28, flexShrink: 0 }} />
              )}

              {/* Bubble */}
              <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                {/* Name + role badge — only on first in group */}
                {!isContinued && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: isMe ? "var(--accent)" : "var(--text)" }}>
                      {isMe ? "You" : msg.username}
                    </span>
                    {roleLabel && (
                      <span style={{
                        fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                        color: roleColor, background: `${roleColor}22`,
                        padding: "1px 5px", borderRadius: "3px",
                      }}>{roleLabel}</span>
                    )}
                  </div>
                )}

                <div style={{
                  background: isMe ? "var(--accent)" : "var(--bg3)",
                  color: isMe ? "#fff" : "var(--text)",
                  border: isMe ? "none" : "1px solid var(--border)",
                  borderRadius: isMe
                    ? isContinued ? "12px 4px 12px 12px" : "12px 4px 12px 12px"
                    : isContinued ? "4px 12px 12px 12px" : "4px 12px 12px 12px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.message}
                </div>

                <span style={{ fontSize: "10px", color: "var(--text2)", marginTop: "3px" }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px",
        alignItems: "flex-end",
        background: "var(--bg2)",
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message everyone…"
          rows={1}
          maxLength={500}
          style={{
            flex: 1,
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "13px",
            padding: "8px 12px",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
            maxHeight: "80px",
            overflowY: "auto",
            fontFamily: "inherit",
          }}
          onInput={(e) => {
            // Auto-grow
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 36, height: 36, flexShrink: 0,
            background: input.trim() ? "var(--accent)" : "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
            transition: "background 0.15s",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
