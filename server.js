const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const MAX_PARTICIPANTS = 6;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, name, create } = {}, callback = () => {}) => {
    roomId = String(roomId || "").trim().toUpperCase();
    name = String(name || "Guest").trim().slice(0, 32) || "Guest";
    create = Boolean(create);

    if (!/^[0-9]+$/.test(roomId)) {
      return callback({ ok: false, error: "Enter a room code containing one or more digits." });
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    const count = room ? room.size : 0;
    if (create && room) {
      return callback({ ok: false, error: "That room code is already in use. Choose another code or join the existing room." });
    }
    if (!create && !room) {
      return callback({ ok: false, error: "That room does not exist. Check the room code or create the room first." });
    }
    if (count >= MAX_PARTICIPANTS) {
      return callback({ ok: false, error: `This room is full (maximum ${MAX_PARTICIPANTS} people).` });
    }

    const peers = room ? [...room] : [];
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    callback({
      ok: true,
      roomId,
      self: { id: socket.id, name },
      peers: peers.map((id) => ({
        id,
        name: io.sockets.sockets.get(id)?.data.name || "Guest"
      })),
      maxParticipants: MAX_PARTICIPANTS
    });

    socket.to(roomId).emit("peer-joined", { id: socket.id, name });
  });

  socket.on("signal", ({ to, data } = {}) => {
    if (!to || !data || !socket.data.roomId) return;
    const target = io.sockets.sockets.get(to);
    if (!target || target.data.roomId !== socket.data.roomId) return;
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    if (socket.data.roomId) {
      socket.to(socket.data.roomId).emit("peer-left", {
        id: socket.id,
        name: socket.data.name || "Guest"
      });
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`RoomWave is running on port ${PORT}`);
});
