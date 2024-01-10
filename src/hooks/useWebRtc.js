import { useCallback, useEffect, useRef } from "react";
import { useStateWithCallback } from "./useStateWithCallback";
import { socket } from "../socket";
import EVENTS from "../socket/frontEvents";
import freeice from "freeice";

const LOCAL_VIDEO = "LOCAL_VIDEO";

export const useWebRtc = (roomId) => {
  const [clients, setClients] = useStateWithCallback([]);

  const addNewClient = useCallback(
    (client, cb) => {
      setClients((list) => {
        if (!list.includes(client)) {
          return [...list, client];
        }

        return list;
      }, cb);
    },
    [clients, setClients]
  );

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerConnections.current[peerID]) {
        return console.log("Already connected to peer");
      }

      peerConnections.current[peerID] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      peerConnections.current[peerID].onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(EVENTS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let trackNumber = 0;

      peerConnections.current[peerID].ontrack = ({
        streams: [remoteStream],
      }) => {
        trackNumber++;

        if (trackNumber === 2) {
          trackNumber = 0;
          addNewClient(peerID, () => {
            peerMediaElements.current[peerID].srcObject = remoteStream;
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[peerID].addTrack(
          track,
          localMediaStream.current
        );
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();

        await peerConnections.current[peerID].setLocalDescription(offer);

        socket.emit(EVENTS.RELAY_SDP, {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on(EVENTS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(EVENTS.ADD_PEER);
    };
  }, []);

  useEffect(() => {
    async function startRecord() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });

      addNewClient(LOCAL_VIDEO, () => {
        const video = peerMediaElements.current[LOCAL_VIDEO];

        if (video) {
          video.volume = 0;
          video.srcObject = localMediaStream.current;
        }
      });
    }

    startRecord()
      .then(() => {
        socket.emit(EVENTS.JOIN, {
          room: roomId,
        });
      })
      .catch((err) => {
        console.log(err);
      });

    return () => {
      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => track.stop());
      }

      socket.emit(EVENTS.LEAVE);
    };
  }, [roomId]);

  useEffect(() => {
    async function setRemoteMedia({ peerID, sessionDescription }) {
      await peerConnections.current[peerID]?.setRemoteDescription(
        new RTCSessionDescription(sessionDescription)
      );

      if (sessionDescription.type === "offer") {
        const answer = await peerConnections.current[peerID].createAnswer();
        await peerConnections.current[peerID].setLocalDescription(answer);
        socket.emit(EVENTS.RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    }

    socket.on(EVENTS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(EVENTS.SESSION_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    socket.on(EVENTS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID]?.addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(EVENTS.ICE_CANDIDATE);
    };
  }, []);

  useEffect(() => {
    socket.on(EVENTS.REMOVE_PEER, ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      setClients((list) => list.filter((element) => element !== peerID));
    });

    return () => {
      socket.off(EVENTS.REMOVE_PEER);
    }
  }, []);

  const provideMediaRef = useCallback((client, mediaElement) => {
    peerMediaElements.current[client] = mediaElement;
  }, []);

  return { clients, provideMediaRef };
};
