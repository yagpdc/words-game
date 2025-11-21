import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { WordsInfiniteRoom, WordsInfiniteRunState } from "../../types/words";

type MyCoopRoomResponse = {
  room: WordsInfiniteRoom;
  run?: WordsInfiniteRunState;
  currentTurnPlayerId?: string;
};

export const useMyCoopRoom = (enabled = true) => {
  return useQuery({
    queryKey: ["my-coop-room"],
    queryFn: async (): Promise<MyCoopRoomResponse | null> => {
      try {
        const response = await axios.get(WORDS_ENDPOINTS.coopMyRoom, {
          withCredentials: true,
        });

        const data = response.data;

        // Backend retorna os dados direto, precisamos normalizar
        if (data && data.roomId) {
          // Normalize run: backend may use `currentGuesses` while frontend expects `guesses`
          let normalizedRun = data.run;
          if (normalizedRun) {
            // If server provided `currentGuesses` but no `guesses`, map it
            if (!normalizedRun.guesses || normalizedRun.guesses.length === 0) {
              if (Array.isArray((normalizedRun as any).currentGuesses) && (normalizedRun as any).currentGuesses.length > 0) {
                normalizedRun = { ...normalizedRun, guesses: (normalizedRun as any).currentGuesses };
              }
            }
          }

          return {
              room: {
              roomId: data.roomId,
              status: data.status,
              players: data.players.map((p: any) => ({
                userId: p.userId,
                name: p.username || p.name,
                avatar: p.avatar,
                isCreator: p.userId === data.createdBy,
              })),
              creatorId: data.createdBy,
              gamesPlayed: data.gamesPlayed || 0,
              createdAt: data.createdAt || new Date().toISOString(),
              startedAt: data.startedAt,
              finishedAt: data.finishedAt,
            } as WordsInfiniteRoom,
              run: normalizedRun,
              currentTurnPlayerId: data.currentTurnPlayer,
          };
        }

        return null;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    refetchInterval: false,
    retry: false,
  });
};
