import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { socket } from "../../socket";
import EVENTS from "../../socket/frontEvents";

export const Main = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState();
  const rootNode = useRef()

  useEffect(() => {
    socket.on(EVENTS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
      setRooms(rooms);
    });
  }, []);

  const goToRoom = () => {
    navigate(`/room/${v4()}`);
  };

  const goToRoomById = (room) => {
    navigate(`/room/${room}`);
  };

  return (
    <div ref={rootNode}>
      <h1>Available rooms</h1>
      <ul>
        {rooms &&
          rooms.map((room) => (
            <li key={room}>
              {room}
              <button onClick={() => goToRoomById(room)}>join</button>
            </li>
          ))}
      </ul>
      <button onClick={goToRoom}>Create new room</button>
    </div>
  );
};
