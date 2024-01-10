const path = require("path");
const express = require("express");
const EVENTS = require("./src/socket/events");
const { validate, version } = require("uuid");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const port = process.env.PORT || 3000;

const getClientsRooms = () => {
  return Array.from(io.sockets.adapter.rooms.keys()).filter(
    (element) => validate(element) && version(element) === 4
  );
};

const shareRoomsInfo = () => {
  io.emit(EVENTS.SHARE_ROOMS, { rooms: getClientsRooms() });
};

io.on("connection", (socket) => {
  shareRoomsInfo();

  socket.on(EVENTS.JOIN, (config) => {
    const { room: roomId } = config;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomId)) {
      return console.log("Already joined");
    }

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || [];

    clientsInRoom.forEach((element) => {
      io.to(element).emit(EVENTS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      socket.emit(EVENTS.ADD_PEER, {
        peerID: element,
        createOffer: true,
      });
    });

    socket.join(roomId);
    shareRoomsInfo();
  });

  const leaveRoom = () => {
    const { rooms } = socket;

    Array.from(rooms).forEach((element) => {
      const clients = Array.from(io.sockets.adapter.rooms.get(element) || []);

      clients.forEach((client) => {
        io.to(client).emit(EVENTS.REMOVE_PEER, { peerID: socket.id });
        socket.emit(EVENTS.REMOVE_PEER, { peerID: client });
      });

      socket.leave(element);
    });

    shareRoomsInfo();
  };

  socket.on(EVENTS.LEAVE, leaveRoom);
  socket.on("disconnecting", leaveRoom);

  socket.on(EVENTS.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(EVENTS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(EVENTS.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(EVENTS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
