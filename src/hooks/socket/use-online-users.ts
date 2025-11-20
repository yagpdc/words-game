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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) {
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
    };

    socket.on("connect", () => {
      setIsConnected(true);
      emitOnlineStatus();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    const invalidateRanking = () => {
      queryClient.invalidateQueries({ queryKey: ["words-ranking"] });
    };

    socket.on("users:online", (payload: OnlineUsersPayload) => {
      if (Array.isArray(payload)) {
        setOnlineUsers(payload);
        invalidateRanking();
        return;
      }
      if (payload && Array.isArray(payload.users)) {
        setOnlineUsers(payload.users);
        invalidateRanking();
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

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, queryClient]);

  const memoizedUsers = useMemo(() => onlineUsers, [onlineUsers]);

  return {
    onlineUsers: memoizedUsers,
    isConnected,
  };
};
