import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { WordsInfiniteRoom } from "../../types/words";

export const useCoopRoomStatus = (roomId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ["coop-room", roomId],
    queryFn: async (): Promise<{ room: WordsInfiniteRoom }> => {
      if (!roomId) throw new Error("Room ID is required");
      
      const response = await axios.get(
        WORDS_ENDPOINTS.coopRoomStatus(roomId),
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    enabled: enabled && !!roomId,
    refetchInterval: false,
  });
};
