import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { CoopGuessPayload, CoopGuessResponse } from "../../types/words";

export const useSubmitCoopGuess = () => {
  return useMutation({
    mutationFn: async (payload: CoopGuessPayload): Promise<CoopGuessResponse> => {
      const response = await axios.post(
        WORDS_ENDPOINTS.coopGuess,
        payload,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
};
