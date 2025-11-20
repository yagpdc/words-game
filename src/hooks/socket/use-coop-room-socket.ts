import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { WORDS_SOCKET_URL } from "../../api/words";
import type {
  RoomPlayerJoinedEvent,
  RoomGameStartedEvent,
  RoomGuessMadeEvent,
  RoomTurnChangedEvent,
  RoomWordCompletedEvent,
  RoomGameOverEvent,
  RoomPlayerAbandonedEvent,
  RoomPlayerLeftEvent,
} from "../../types/words";

type CoopRoomEventHandlers = {
  onPlayerJoined?: (event: RoomPlayerJoinedEvent) => void;
  onGameStarted?: (event: RoomGameStartedEvent) => void;
  onGuessMade?: (event: RoomGuessMadeEvent) => void;
  onTurnChanged?: (event: RoomTurnChangedEvent) => void;
  onWordCompleted?: (event: RoomWordCompletedEvent) => void;
  onGameOver?: (event: RoomGameOverEvent) => void;
  onPlayerAbandoned?: (event: RoomPlayerAbandonedEvent) => void;
  onPlayerLeft?: (event: RoomPlayerLeftEvent) => void;
};

export const useCoopRoomSocket = (
  roomId: string | null,
  handlers: CoopRoomEventHandlers
) => {
  const socketRef = useRef<Socket | null>(null);
  const hasJoinedRoomRef = useRef(false);

  const joinRoom = useCallback(() => {
    if (socketRef.current && roomId && !hasJoinedRoomRef.current) {
      console.log("🚪 Socket: Fazendo join na sala", roomId);
      socketRef.current.emit("room:join", { roomId });
      hasJoinedRoomRef.current = true;
    } else {
      console.log("⚠️ Socket: Não pode fazer join -", {
        hasSocket: !!socketRef.current,
        roomId,
        alreadyJoined: hasJoinedRoomRef.current,
      });
    }
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomId && hasJoinedRoomRef.current) {
      socketRef.current.emit("room:leave", { roomId });
      hasJoinedRoomRef.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      if (socketRef.current) {
        leaveRoom();
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(WORDS_SOCKET_URL, {
      transports: ["polling"], // ⬅️ Apenas polling (Azure não suporta WebSocket no plano atual)
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    console.log("🔌 Socket: Conectando ao servidor", WORDS_SOCKET_URL, "para sala", roomId);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket: Conectado! ID:", socket.id);
      joinRoom();
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket: Desconectado");
      hasJoinedRoomRef.current = false;
    });

    // Room events
    socket.on("room:player-joined", (event: RoomPlayerJoinedEvent) => {
      console.log("📥 Socket: player-joined", event);
      handlers.onPlayerJoined?.(event);
    });

    socket.on("room:game-started", (event: RoomGameStartedEvent) => {
      console.log("📥 Socket: game-started", event);
      handlers.onGameStarted?.(event);
    });

    socket.on("room:guess-made", (event: RoomGuessMadeEvent) => {
      console.log("📥 Socket: guess-made", event);
      handlers.onGuessMade?.(event);
    });

    socket.on("room:turn-changed", (event: RoomTurnChangedEvent) => {
      console.log("📥 Socket: turn-changed", event);
      handlers.onTurnChanged?.(event);
    });

    socket.on("room:word-completed", (event: RoomWordCompletedEvent) => {
      console.log("📥 Socket: word-completed", event);
      handlers.onWordCompleted?.(event);
    });

    socket.on("room:game-over", (event: RoomGameOverEvent) => {
      console.log("📥 Socket: game-over", event);
      handlers.onGameOver?.(event);
    });

    socket.on("room:player-abandoned", (event: RoomPlayerAbandonedEvent) => {
      console.log("📥 Socket: player-abandoned", event);
      handlers.onPlayerAbandoned?.(event);
    });

    socket.on("room:player-left", (event: RoomPlayerLeftEvent) => {
      handlers.onPlayerLeft?.(event);
    });

    return () => {
      leaveRoom();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      hasJoinedRoomRef.current = false;
    };
  }, [roomId, handlers, joinRoom, leaveRoom]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    joinRoom,
    leaveRoom,
  };
};
