# 🎬 YouTube Watch Party

> Watch YouTube videos together in real time — synced playback, live chat, and role-based controls. No account needed.

![Stack](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socketdotio&logoColor=white)
![Stack](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)

Backend on Railways - [youtubewatchpartysystem-production.up.railway.app](https://youtubewatchpartysystem-production.up.railway.app/)
Frontend on Vercel - https://youtube-watch-party-system-rust.vercel.app/

---

## What It Does

Create a room, share a 6-character code with friends, and watch any YouTube video together — play, pause, and seek events are pushed to every participant in under a second. A built-in chat, moderator roles, and automatic host transfer round out the experience.

---

## Feature Overview

| | Feature | Detail |
|---|---|---|
| 🔗 | **Instant Rooms** | 6-char alphanumeric code, no sign-up required |
| ▶ | **Synced Playback** | Play / pause / seek broadcast to all clients via Socket.IO |
| ⏱ | **Latency Compensation** | `sentAt` timestamp offsets network round-trip on play events |
| 📡 | **Drift Correction** | Host sends a time heartbeat every 5 s; participants silently re-seek if drift > 1.5 s |
| 🎭 | **Role System** | Host → Moderator → Participant with server-enforced permission checks |
| 💬 | **Live Chat** | Room messages persisted in MongoDB, loaded on join |
| 🚪 | **Graceful Leave** | Auto host-transfer on host disconnect; tab-close handled via `disconnecting` event |
| 📱 | **Responsive UI** | Fluid layout with `clamp()` — sidebar slides up as a sheet on mobile |
| 🔇 | **Audio Unlock** | Browser autoplay policy handled with a one-time "Click to watch" overlay |

---

## Tech Stack

**Backend** — `Node.js` · `Express 5` · `Socket.IO 4` · `MongoDB / Mongoose`

**Frontend** — `React 19` · `Vite` · `socket.io-client` · `react-youtube`

---

## Project Structure

```
watch-party-system/
│
├── backend/src/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── socket.js              # Socket.IO server initialisation
│   ├── controllers/
│   │   └── auth.controller.js     # Register / login / logout / me
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT protect middleware
│   │   └── error.middleware.js    # Global error handler
│   ├── models/
│   │   ├── Room.js                # Room + embedded participant schema
│   │   ├── Message.js             # Chat message schema
│   │   └── User.js                # User schema (bcrypt + JWT, ready for auth)
│   ├── routes/
│   │   └── auth.routes.js
│   ├── services/
│   │   ├── room.service.js        # Create / join / leave business logic
│   │   ├── permission.service.js  # Role assignment, remove, transfer host
│   │   └── vedio.service.js       # Video state persistence
│   ├── socket/
│   │   ├── index.js               # Registers all event handlers per connection
│   │   ├── room.socket.js         # Room lifecycle events
│   │   ├── vedio.socket.js        # Video sync events + permission checks
│   │   └── chat.socket.js         # Chat send / history events
│   └── utils/
│       ├── generateRoomCode.js    # nanoid 6-char room codes
│       ├── extractVedioId.js      # YouTube URL → video ID parser
│       └── jwt.js                 # sign / verify / cookie helpers
│
└── frontend/src/
    ├── components/
    │   ├── LandingPage.jsx        # Hero, feature cards, create/join form
    │   ├── Room.jsx               # Room shell: header + video + sidebar
    │   ├── VideoPlayer.jsx        # YouTube embed, sync logic, audio unlock
    │   ├── ParticipantList.jsx    # Participant rows + host/mod action buttons
    │   └── Chat.jsx               # Message list + auto-grow textarea input
    ├── socket/
    │   └── socket.js              # Singleton socket.io-client instance
    ├── App.jsx                    # Top-level routing (landing ↔ room)
    └── App.css                    # CSS variables + global reset
```

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (or local MongoDB)

### 1 — Clone

```bash
git clone https://github.com/Sparsh9844/Youtube_watch_party_system.git
cd Youtube_watch_party_system
```

### 2 — Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in your values
npm run dev             # http://localhost:5000
```

**Required `.env` variables:**

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<db>
CLIENT_URL=http://localhost:5173
JWT_SECRET=any_long_random_string
NODE_ENV=development
```

### 3 — Frontend

```bash
cd ../frontend
npm install
cp .env.example .env    # then fill in your values
npm run dev             # http://localhost:5173
```

**Required `.env` variables:**

```env
VITE_BACKEND_URL=http://localhost:5000
```

### 4 — Test it

1. Open `http://localhost:5173`, enter a name → **Create Room** → note the room code
2. Open an incognito tab, enter the same name and code → **Join Room**
3. Paste a YouTube URL in the host's player → both players load the video
4. Press play on the host side — the participant's video starts in sync

---

## WebSocket Architecture

### Why WebSockets?

HTTP is request-response — the client must always initiate. A watch party requires the **server to push to all clients simultaneously**. When the host presses play, every participant must receive that event in milliseconds. Socket.IO keeps a persistent full-duplex connection open, making instant multi-cast possible.

### Connection Lifecycle

```
1. App mounts → socket.connect() called
2. Socket.IO handshake → connection established
3. User creates / joins a room → socket.join(roomCode)
   All subsequent events are scoped to that Socket.IO room
4. User leaves / tab closes → disconnecting event fires
   → auto-removes participant, auto-transfers host if needed
```

### Video Sync Flow

```
Host presses Play
  │
  ├─► emit("play", { roomCode, currentTime, sentAt: Date.now() })
  │
  Server:  saves isPlaying=true to DB
           socket.to(roomCode).emit("video_played", { sentAt, data })
           ↑ excludes the host (they're already playing)
  │
  Participant receives "video_played":
    latencyS = (Date.now() - sentAt) / 1000
    player.seekTo(currentTime + latencyS)   ← offset for network delay
    player.playVideo()

Every 5 seconds while playing:
  Host ──► emit("sync_time", { currentTime, sentAt })
  Server relays to everyone else
  Participant: if |myTime - targetTime| > 1.5s → silently seekTo
```

### Permission Check (every video event)

```js
// vedio.socket.js — runs on play, pause, seek, change_video
const checkController = async (roomCode, socketId) => {
  const room = await Room.findOne({ roomCode });
  const p = room.participants.find(p => p.socketId === socketId);
  return p && ["host", "moderator"].includes(p.role);
};
// Rejected with error callback if false — client cannot bypass this
```

### Disconnect Cleanup

```js
// room.socket.js
socket.on("disconnecting", async () => {
  for (const roomCode of socket.rooms) {
    if (roomCode === socket.id) continue;
    await leaveRoomService({ roomCode, socketId: socket.id });
    // auto-transfers host to next moderator or first participant
  }
});
```

---

## Permissions Matrix

| Action | Host | Moderator | Participant |
|---|:---:|:---:|:---:|
| Load / change video | ✅ | ✅ | ❌ |
| Play / Pause / Seek | ✅ | ✅ | ❌ |
| Send chat message | ✅ | ✅ | ✅ |
| Promote to Moderator | ✅ | ❌ | ❌ |
| Demote Moderator | ✅ | ❌ | ❌ |
| Remove participant | ✅ | ✅ | ❌ |
| Remove moderator | ✅ | ❌ | ❌ |
| Transfer host | ✅ | ❌ | ❌ |

---

## Socket Event Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `create_room` | C → S | `{ username }` | Create room, become host |
| `join_room` | C → S | `{ roomCode, username }` | Join existing room |
| `leave_room` | C → S | `{ roomCode }` | Leave gracefully |
| `user_joined` | S → C | `{ username, userId, role, participants }` | Broadcast on join |
| `user_left` | S → C | `{ username, userId, participants }` | Broadcast on leave |
| `change_video` | C → S | `{ roomCode, videoUrl }` | Load YouTube video |
| `play` | C → S | `{ roomCode, currentTime, sentAt }` | Play (host/mod only) |
| `pause` | C → S | `{ roomCode, currentTime }` | Pause (host/mod only) |
| `seek` | C → S | `{ roomCode, time }` | Seek (host/mod only) |
| `sync_state` | S → C | `{ playState, currentTime, videoId }` | Full state on join/change |
| `sync_time` | S → C | `{ currentTime, sentAt }` | Periodic drift correction |
| `send_message` | C → S | `{ roomCode, message }` | Send chat message |
| `new_message` | S → C | `{ username, message, role, createdAt }` | Broadcast new message |
| `get_messages` | C → S | `{ roomCode }` | Fetch last 50 messages |
| `assign_role` | C → S | `{ roomCode, targetSocketId, newRole }` | Assign role (host only) |
| `remove_participant` | C → S | `{ roomCode, targetSocketId }` | Remove user |
| `transfer_host` | C → S | `{ roomCode, targetSocketId }` | Transfer host role |
| `role_assigned` | S → C | `{ userId, username, role, participants }` | Role change broadcast |
| `kicked` | S → C | `{ message }` | Notify removed user |

---

## Author

**Sparsh Chauhan** · [GitHub](https://github.com/Sparsh9844)
