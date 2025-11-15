import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  DailyGuessPayload,
  DailyGuessResponse,
} from "../../types/words";

export const useSubmitDailyGuessMutation = () => {
  return useMutation<DailyGuessResponse, Error, DailyGuessPayload>({
    mutationFn: async (payload: DailyGuessPayload) => {
      const { data } = await axios.post<DailyGuessResponse>(
        `${WORDS_ENDPOINTS.dailyPuzzle}/guess`,
        payload,
      );

      return data;
    },
  });
};
