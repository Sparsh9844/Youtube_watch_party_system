import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["host", "moderator", "participant"],
      default: "participant",
    },
  },
  {
    _id: false,
  }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    hostId: {
      type: String,
      required: true,
    },

    video: {
      videoId: {
        type: String,
        default: "",
      },

      currentTime: {
        type: Number,
        default: 0,
      },

      isPlaying: {
        type: Boolean,
        default: false,
      },

      lastUpdatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    participants: [participantSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Room", roomSchema);