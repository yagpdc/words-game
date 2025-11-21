import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { WORDS_SOCKET_URL } from "../../api/words";
import { useAuth } from "../auth/use-auth.hook";

type OnlineUsersPayload = string[] | { users: string[] };

type UseOnlineUsersResult = {
  onlineUsers: string[];
  isConnected: boolean;
};

export const useOnlineUsers = (): UseOnlineUsersResult => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const hasIdentifiedRef = useRef(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const stopHeartbeat = () => {
      if (heartbeatRef.current != null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const emitUserOffline = (socket?: Socket | null) => {
      const targetSocket = socket ?? socketRef.current;
      if (targetSocket?.connected && hasIdentifiedRef.current) {
        targetSocket.emit("user:offline");
        hasIdentifiedRef.current = false;
      }
    };

    if (!user?.id) {
      stopHeartbeat();
      emitUserOffline();
      setOnlineUsers([]);
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(WORDS_SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    const emitOnlineStatus = () => {
      socket.emit("user:online", { userId: user.id });
      socket.emit("users:request");
      hasIdentifiedRef.current = true;
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      socket.emit("user:heartbeat");
      heartbeatRef.current = window.setInterval(() => {
        socket.emit("user:heartbeat");
      }, 30_000);
    };

    const invalidateRanking = () => {
      queryClient.invalidateQueries({ queryKey: ["words-ranking"] });
    };

    socket.on("connect", () => {
      setIsConnected(true);
      emitOnlineStatus();
      startHeartbeat();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      stopHeartbeat();
    });

    socket.on("users:online", (payload: any) => {
      console.log("📥 Socket: users:online payload:", payload);

      if (Array.isArray(payload)) {
        setOnlineUsers(payload);
        invalidateRanking();
        return;
      }

      if (payload) {
        if (Array.isArray(payload.users)) {
          setOnlineUsers(payload.users);
          invalidateRanking();
          return;
        }

        if (Array.isArray((payload as any).onlineUserIds)) {
          setOnlineUsers((payload as any).onlineUserIds);
          invalidateRanking();
          return;
        }
      }
    });

    socket.on("user:online", (payload: { userId: string }) => {
      if (payload?.userId) {
        setOnlineUsers((prev) => {
          if (prev.includes(payload.userId)) return prev;
          return [...prev, payload.userId];
        });
        invalidateRanking();
      }
    });

    socket.on("user:offline", (payload: { userId: string }) => {
      if (payload?.userId) {
        setOnlineUsers((prev) => prev.filter((id) => id !== payload.userId));
        invalidateRanking();
      }
    });

    const handleBeforeUnload = () => {
      emitUserOffline(socket);
      stopHeartbeat();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      emitUserOffline(socket);
      stopHeartbeat();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, queryClient]);

  const memoizedUsers = useMemo(() => onlineUsers, [onlineUsers]);

  // Notify other parts of the app (e.g. OnlineToastProvider) about updates
  // using a window CustomEvent. The provider listens for `onlineUsersUpdate`.
  // Guard against non-browser environments.
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const detail = { onlineUserIds: memoizedUsers };
        const ev = new CustomEvent("onlineUsersUpdate", { detail });
        window.dispatchEvent(ev);
      }
    } catch (e) {
      // ignore in non-supporting environments
    }
  }, [memoizedUsers]);

  return {
    onlineUsers: memoizedUsers,
    isConnected,
  };
};
