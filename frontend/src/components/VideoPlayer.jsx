import { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import socket from "../socket/socket";

const SYNC_INTERVAL_MS = 5000;
const SYNC_THRESHOLD_S = 1.5;

function VideoPlayer({ roomCode, video, isController, onVideoUpdate }) {
  const [urlInput, setUrlInput] = useState("");
  const [loadError, setLoadError] = useState("");

  // Participants must click once to unlock audio (browser autoplay policy).
  // After that click we have a "user gesture" so playVideo() will play with sound.
  const [audioUnlocked, setAudioUnlocked] = useState(isController);

  // Stores a pending play command that arrived before the user clicked
  const pendingPlay = useRef(null);

  const playerRef = useRef(null);
  const suppressCount = useRef(0);

  // ─── Request current state on mount ──────────────────────────
  useEffect(() => {
    socket.emit("get_sync_state", { roomCode });
  }, [roomCode]);

  // ─── Load video (controller only) ────────────────────────────
  const handleLoadVideo = () => {
    const url = urlInput.trim();
    if (!url) return setLoadError("Please enter a YouTube URL");
    setLoadError("");
    socket.emit("change_video", { roomCode, videoUrl: url }, (res) => {
      if (res.success) {
        setUrlInput("");
        onVideoUpdate(res.data);
      } else {
        setLoadError(res.message);
      }
    });
  };

  // ─── Participant clicks the overlay to unlock audio ───────────
  const handleUnlockAudio = () => {
    setAudioUnlocked(true);

    // If a play command came in while we were waiting, execute it now
    if (pendingPlay.current && playerRef.current) {
      const { currentTime } = pendingPlay.current;
      playerRef.current.seekTo(currentTime, true);
      suppressCount.current += 1;
      playerRef.current.playVideo();
      pendingPlay.current = null;
    }
  };

  // ─── YouTube callbacks ────────────────────────────────────────
  const onReady = (e) => {
    playerRef.current = e.target;
  };

  const onStateChange = (e) => {
    if (suppressCount.current > 0) {
      suppressCount.current -= 1;
      return;
    }
    if (!isController) return;

    const currentTime = e.target.getCurrentTime();
    if (e.data === 1) {
      socket.emit("play", { roomCode, currentTime, sentAt: Date.now() }, () => {});
    } else if (e.data === 2) {
      socket.emit("pause", { roomCode, currentTime }, () => {});
    }
  };

  // ─── Incoming socket events ───────────────────────────────────
  useEffect(() => {
    socket.on("video_changed", (res) => {
      if (!res.success) return;
      onVideoUpdate(res.data);
    });

    socket.on("video_played", (res) => {
      if (!res.success) return;
      const player = playerRef.current;
      if (!player) return;

      const latencyS = res.sentAt ? (Date.now() - res.sentAt) / 1000 : 0;
      const targetTime = res.data.currentTime + latencyS;

      if (!audioUnlocked) {
        // Audio not unlocked yet — store the command and wait for user click
        pendingPlay.current = { currentTime: targetTime };
        return;
      }

      player.seekTo(targetTime, true);
      suppressCount.current += 1;
      player.playVideo();
    });

    socket.on("video_paused", (res) => {
      if (!res.success) return;
      const player = playerRef.current;
      if (!player) return;
      pendingPlay.current = null; // cancel any pending play
      player.seekTo(res.data.currentTime, true);
      suppressCount.current += 1;
      player.pauseVideo();
    });

    socket.on("video_seeked", (res) => {
      if (!res.success) return;
      const player = playerRef.current;
      if (!player) return;
      player.seekTo(res.data.currentTime, true);
    });

    socket.on("sync_state", ({ playState, currentTime, videoId }) => {
      if (!videoId) return;
      onVideoUpdate({ videoId, currentTime, isPlaying: playState === "playing" });

      const player = playerRef.current;
      if (!player) return;

      const timeDiff = Math.abs(player.getCurrentTime() - currentTime);
      const playerState = player.getPlayerState();

      if (playState === "playing" && playerState !== 1) {
        if (!audioUnlocked) {
          pendingPlay.current = { currentTime };
          return;
        }
        player.seekTo(currentTime, true);
        suppressCount.current += 1;
        player.playVideo();
      } else if (playState === "paused" && playerState !== 2) {
        player.seekTo(currentTime, true);
        suppressCount.current += 1;
        player.pauseVideo();
      } else if (timeDiff > SYNC_THRESHOLD_S) {
        player.seekTo(currentTime, true);
      }
    });

    return () => {
      socket.off("video_changed");
      socket.off("video_played");
      socket.off("video_paused");
      socket.off("video_seeked");
      socket.off("sync_state");
    };
  }, [roomCode, audioUnlocked]);

  // ─── Controller: periodic sync_time heartbeat ────────────────
  useEffect(() => {
    if (!isController) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (player.getPlayerState() === 1) {
        socket.emit("sync_time", {
          roomCode,
          currentTime: player.getCurrentTime(),
          sentAt: Date.now(),
        });
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isController, roomCode]);

  // ─── Participant: receive sync_time heartbeat ─────────────────
  useEffect(() => {
    if (isController) return;
    const onSyncTime = ({ currentTime, sentAt }) => {
      const player = playerRef.current;
      if (!player) return;
      const latencyS = (Date.now() - sentAt) / 1000;
      const target = currentTime + latencyS;
      if (Math.abs(player.getCurrentTime() - target) > SYNC_THRESHOLD_S) {
        player.seekTo(target, true);
      }
    };
    socket.on("sync_time", onSyncTime);
    return () => socket.off("sync_time", onSyncTime);
  }, [isController]);

  // ─── Player options ───────────────────────────────────────────
  const opts = {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      disablekb: isController ? 0 : 1,
      fs: isController ? 1 : 0,
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* URL input — controllers only */}
      {isController && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
          <input
            type="text" placeholder="Paste YouTube URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
            style={{
              flex: "1 1 160px", minWidth: 0, padding: "clamp(7px,1.5vw,9px) clamp(10px,2vw,14px)",
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "8px", color: "var(--text)", fontSize: "clamp(12px,2vw,14px)", outline: "none",
            }}
          />
          <button onClick={handleLoadVideo} style={{
            padding: "clamp(7px,1.5vw,9px) clamp(12px,2vw,18px)", background: "#ff0000", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer",
            fontWeight: 700, fontSize: "clamp(11px,1.8vw,13px)", whiteSpace: "nowrap", flexShrink: 0,
          }}>Load Video</button>
        </div>
      )}

      {loadError && (
        <p style={{ margin: "0 0 4px", fontSize: "13px", color: "var(--red)" }}>{loadError}</p>
      )}

      {/* Player wrapper */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          background: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {video.videoId ? (
          <>
            <YouTube
              key={video.videoId}
              videoId={video.videoId}
              opts={opts}
              onReady={onReady}
              onStateChange={onStateChange}
              style={{ width: "100%", height: "100%" }}
            />

            {/* Participant overlay — two states:
                1. Before audio unlock: big "Click to watch" button
                2. After unlock: invisible overlay that just blocks controls  */}
            {!isController && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // Once unlocked, make it fully transparent but keep blocking clicks
                  background: audioUnlocked ? "transparent" : "rgba(0,0,0,0.55)",
                  cursor: audioUnlocked ? "default" : "pointer",
                  transition: "background 0.3s",
                }}
                onClick={!audioUnlocked ? handleUnlockAudio : undefined}
              >
                {!audioUnlocked && (
                  <div style={{ textAlign: "center", color: "#fff", userSelect: "none" }}>
                    <div style={{ fontSize: "52px", marginBottom: "12px" }}>▶</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                      Click to watch with audio
                    </div>
                    <div style={{ fontSize: "13px", color: "#ccc", marginTop: "6px" }}>
                      Your browser requires a click before playing sound
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "var(--text2)", gap: "10px",
            }}
          >
            <span style={{ fontSize: "40px" }}>🎬</span>
            <span style={{ fontSize: "15px", fontWeight: 600 }}>
              {isController ? "Paste a YouTube URL above to load a video" : "Waiting for the host to load a video…"}
            </span>
          </div>
        )}
      </div>

      {/* Status line below player */}
      {!isController && video.videoId && (
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text2)" }}>
          {audioUnlocked
            ? "⏯ Playback is controlled by the host or moderator"
            : "🔇 Click the video above to enable audio"}
        </p>
      )}
    </div>
  );
}

export default VideoPlayer;
