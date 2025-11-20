import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { WORDS_SOCKET_URL } from "../../api/words";
import { useAuth } from "../auth/use-auth.hook";
import type {
  RoomPlayerJoinedEvent,
  RoomGameStartedEvent,
  RoomGuessMadeEvent,
  RoomTurnChangedEvent,
  RoomWordCompletedEvent,
  RoomGameOverEvent,
  RoomPlayerAbandonedEvent,
  RoomPlayerLeftEvent,
  RoomRematchRequestEvent,
  RoomRematchResponseEvent,
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
  onRematchRequest?: (event: RoomRematchRequestEvent) => void;
  onRematchResponse?: (event: RoomRematchResponseEvent) => void;
};

export const useCoopRoomSocket = (
  roomId: string | null,
  handlers: CoopRoomEventHandlers
) => {
  const socketRef = useRef<Socket | null>(null);
  const hasJoinedRoomRef = useRef(false);
  const { user } = useAuth();

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

    if (!user?.id) {
      console.warn("⚠️ Socket: Usuário não autenticado, aguardando...");
      return;
    }

    const socket = io(WORDS_SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      query: {
        userId: user.id,
      },
    });

    console.log("🔌 Socket: Conectando ao servidor", WORDS_SOCKET_URL, "para sala", roomId, "userId:", user.id);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket: Conectado! ID:", socket.id);
      joinRoom();
    });

    socket.on("room:joined", (data: { roomId: string; socketId: string }) => {
      console.log("✅ Socket: Confirmação de entrada na sala", data);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket: Desconectado. Razão:", reason);
      hasJoinedRoomRef.current = false;
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket: Erro de conexão:", error.message);
    });

    socket.on("error", (error) => {
      console.error("🔴 Socket: Erro:", error);
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

    socket.on("room:rematch-request", (event: RoomRematchRequestEvent) => {
      console.log("🔄 Socket: rematch-request", event);
      handlers.onRematchRequest?.(event);
    });

    socket.on("room:rematch-response", (event: RoomRematchResponseEvent) => {
      console.log("🔄 Socket: rematch-response", event);
      handlers.onRematchResponse?.(event);
    });

    return () => {
      leaveRoom();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      hasJoinedRoomRef.current = false;
    };
  }, [roomId, handlers, joinRoom, leaveRoom, user?.id]);

  const requestRematch = useCallback(() => {
    if (socketRef.current && roomId) {
      console.log("🔄 Enviando pedido de rematch para sala", roomId);
      socketRef.current.emit("room:rematch-request", { roomId });
    }
  }, [roomId]);

  const respondToRematch = useCallback((accepted: boolean) => {
    if (socketRef.current && roomId) {
      console.log(`${accepted ? '✅' : '❌'} Respondendo rematch:`, accepted);
      socketRef.current.emit("room:rematch-response", { roomId, accepted });
    }
  }, [roomId]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    joinRoom,
    leaveRoom,
    requestRematch,
    respondToRematch,
  };
};
