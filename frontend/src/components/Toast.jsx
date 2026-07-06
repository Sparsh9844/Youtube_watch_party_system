/**
 * Toast + Confirm system
 *
 * Exports:
 *   <ToastProvider>   — wrap your app (or Room) with this
 *   useToast()        — returns { toast, confirm }
 *     toast(msg, type?)  — show a notification ("success"|"error"|"info"|"warn")
 *     confirm(msg, opts) — styled confirm dialog, returns Promise<boolean>
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";

/* ─── icons ─────────────────────────────────────────────────── */
const ICONS = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warn:    "⚠️",
};

const COLORS = {
  success: { bg: "rgba(63,185,80,0.12)",  border: "rgba(63,185,80,0.35)",  text: "#3fb950" },
  error:   { bg: "rgba(248,81,73,0.12)",  border: "rgba(248,81,73,0.35)",  text: "#f85149" },
  info:    { bg: "rgba(47,129,247,0.12)", border: "rgba(47,129,247,0.35)", text: "#2f81f7" },
  warn:    { bg: "rgba(230,126,0,0.12)",  border: "rgba(230,126,0,0.35)",  text: "#e67e00" },
};

/* ─── context ────────────────────────────────────────────────── */
const ToastCtx = createContext(null);

/* ─── provider ───────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts,  setToasts]  = useState([]);
  const [confirm, setConfirm] = useState(null); // { message, subtext, resolve }
  const idRef = useRef(0);

  /* show a toast */
  const toast = useCallback((message, type = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* styled confirm dialog — returns Promise<boolean> */
  const showConfirm = useCallback((message, subtext = "") => {
    return new Promise((resolve) => {
      setConfirm({ message, subtext, resolve });
    });
  }, []);

  const handleConfirm = (value) => {
    if (confirm?.resolve) confirm.resolve(value);
    setConfirm(null);
  };

  return (
    <ToastCtx.Provider value={{ toast, confirm: showConfirm }}>
      {children}

      {/* ── Toast stack ── */}
      <div style={{
        position: "fixed", top: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: "10px",
        pointerEvents: "none",
        maxWidth: "min(340px, calc(100vw - 32px))",
      }}>
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} style={{
              background: "var(--bg2)",
              border: `1px solid ${c.border}`,
              borderLeft: `4px solid ${c.text}`,
              borderRadius: "10px",
              padding: "12px 40px 12px 14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              display: "flex", alignItems: "flex-start", gap: "10px",
              pointerEvents: "all",
              position: "relative",
              animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1.3 }}>{ICONS[t.type]}</span>
              <span style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.5 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  position: "absolute", top: 8, right: 8,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text2)", fontSize: "14px", lineHeight: 1,
                  padding: "2px 4px", borderRadius: "4px",
                }}>✕</button>
            </div>
          );
        })}
      </div>

      {/* ── Confirm dialog ── */}
      {confirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}>
          <div style={{
            background: "var(--bg2)", border: "1px solid var(--border)",
            borderRadius: "16px", padding: "28px 28px 22px",
            width: "100%", maxWidth: "380px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            animation: "confirmIn 0.2s cubic-bezier(0.34,1.4,0.64,1)",
          }}>
            <div style={{ fontSize: "36px", marginBottom: "12px", textAlign: "center" }}>⚠️</div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px", textAlign: "center", color: "var(--text)" }}>
              {confirm.message}
            </h3>
            {confirm.subtext && (
              <p style={{ fontSize: "13px", color: "var(--text2)", textAlign: "center", marginBottom: "20px", lineHeight: 1.5 }}>
                {confirm.subtext}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => handleConfirm(false)} style={{
                flex: 1, padding: "11px", borderRadius: "8px", fontWeight: 600,
                fontSize: "14px", cursor: "pointer",
                background: "var(--bg3)", color: "var(--text2)",
                border: "1px solid var(--border)",
              }}>Cancel</button>
              <button onClick={() => handleConfirm(true)} style={{
                flex: 1, padding: "11px", borderRadius: "8px", fontWeight: 700,
                fontSize: "14px", cursor: "pointer",
                background: "var(--red)", color: "#fff", border: "none",
                boxShadow: "0 4px 14px rgba(248,81,73,0.35)",
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

/* ─── hook ───────────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
