import { useState, useEffect, useRef } from "react";
import socket from "../socket/socket";
import { useToast } from "./Toast";

const ROLE_COLORS = {
  host:        "#f85149",
  moderator:   "#e67e00",
  participant: "#2f81f7",
};

const ROLE_LABELS = {
  host:      "Host",
  moderator: "Mod",
};

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ roomCode, me, onUnread }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef    = useRef(null);
  const listRef      = useRef(null);
  const textareaRef  = useRef(null);
  const isAtBottom   = useRef(true);

  // ─── Load history ──────────────────────────────────────────────
  useEffect(() => {
    socket.emit("get_messages", { roomCode }, (res) => {
      if (res.success) setMessages(res.data);
    });
  }, [roomCode]);

  // ─── Live messages ─────────────────────────────────────────────
  useEffect(() => {
    const handleNew = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.userId !== socket.id) onUnread?.();
    };
    socket.on("new_message", handleNew);
    return () => socket.off("new_message", handleNew);
  }, [roomCode, onUnread]);

  // ─── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  // ─── Send ──────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    socket.emit("send_message", { roomCode, message: text }, (res) => {
      setSending(false);
      if (!res.success) toast(res.message, "error");
    });
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg2)",
    }}>

      {/* ── Message list ────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          // Smooth overscroll on iOS
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--text2)", gap: "10px", textAlign: "center",
            padding: "40px 20px",
          }}>
            <span style={{ fontSize: "36px" }}>💬</span>
            <span style={{ fontSize: "14px", lineHeight: 1.5 }}>
              No messages yet.<br />Say hi to start the conversation!
            </span>
          </div>
        )}

        {/* Messages */}
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
                marginTop: isContinued ? "2px" : "12px",
              }}
            >
              {/* Avatar */}
              {!isContinued ? (
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: isMe ? "var(--accent)" : roleColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: "#fff",
                  alignSelf: "flex-end",
                }}>
                  {msg.username[0].toUpperCase()}
                </div>
              ) : (
                <div style={{ width: 30, flexShrink: 0 }} />
              )}

              {/* Bubble + meta */}
              <div style={{
                maxWidth: "78%",
                display: "flex", flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
              }}>
                {/* Name + role */}
                {!isContinued && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px",
                  }}>
                    <span style={{
                      fontSize: "12px", fontWeight: 700,
                      color: isMe ? "var(--accent)" : "var(--text)",
                    }}>
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

                {/* Bubble */}
                <div style={{
                  background: isMe
                    ? "linear-gradient(135deg, #2f81f7, #1a6fd8)"
                    : "var(--bg3)",
                  color: isMe ? "#fff" : "var(--text)",
                  border: isMe ? "none" : "1px solid var(--border)",
                  borderRadius: isMe
                    ? "18px 4px 18px 18px"
                    : "4px 18px 18px 18px",
                  padding: "9px 14px",
                  fontSize: "14px",
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  boxShadow: isMe
                    ? "0 2px 8px rgba(47,129,247,0.3)"
                    : "0 1px 3px rgba(0,0,0,0.2)",
                }}>
                  {msg.message}
                </div>

                {/* Timestamp */}
                <span style={{
                  fontSize: "10px", color: "var(--text2)",
                  marginTop: "3px",
                  paddingLeft: isMe ? 0 : "2px",
                  paddingRight: isMe ? "2px" : 0,
                }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────── */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px",
        alignItems: "flex-end",
        background: "var(--bg2)",
        // Stick above iOS keyboard
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Message…"
          rows={1}
          maxLength={500}
          style={{
            flex: 1,
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            color: "var(--text)",
            fontSize: "15px",        // 15px prevents iOS zoom on focus
            padding: "9px 16px",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
            maxHeight: "100px",
            overflowY: "auto",
            fontFamily: "inherit",
            WebkitAppearance: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e)  => { e.target.style.borderColor = "var(--border)"; }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: 40, height: 40, flexShrink: 0,
            background: canSend
              ? "linear-gradient(135deg, #2f81f7, #1a6fd8)"
              : "var(--bg3)",
            border: canSend ? "none" : "1px solid var(--border)",
            borderRadius: "50%",
            cursor: canSend ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px",
            transition: "background 0.15s, transform 0.1s",
            boxShadow: canSend ? "0 2px 8px rgba(47,129,247,0.4)" : "none",
            transform: canSend ? "scale(1)" : "scale(0.9)",
          }}
          onMouseDown={(e) => { if (canSend) e.currentTarget.style.transform = "scale(0.92)"; }}
          onMouseUp={(e)   => { e.currentTarget.style.transform = canSend ? "scale(1)" : "scale(0.9)"; }}
        >
          {sending ? (
            <span style={{ fontSize: "13px", color: "var(--text2)" }}>…</span>
          ) : (
            <span style={{ color: canSend ? "#fff" : "var(--text2)", marginLeft: "2px" }}>➤</span>
          )}
        </button>
      </div>
    </div>
  );
}
