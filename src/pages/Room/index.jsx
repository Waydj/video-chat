import { useParams } from "react-router-dom";
import { useWebRtc } from "../../hooks/useWebRtc";

export const Room = () => {
  const { id: roomId } = useParams();
  const { provideMediaRef, clients } = useWebRtc(roomId);

  console.log(clients);

  return (
    <div>
      {clients.map((client) => (
        <video
          ref={(instance) => {
            provideMediaRef(client, instance);
          }}
          key={client}
          autoPlay
          playsInline
          muted={client === "LOCAL_VIDEO"}
        />
      ))}
    </div>
  );
};
