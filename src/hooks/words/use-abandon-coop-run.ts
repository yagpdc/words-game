import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";

export const useAbandonCoopRun = () => {
  return useMutation({
    mutationFn: async (roomId: string): Promise<void> => {
      await axios.post(
        WORDS_ENDPOINTS.coopAbandon,
        { roomId },
        {
          withCredentials: true,
        }
      );
    },
  });
};
