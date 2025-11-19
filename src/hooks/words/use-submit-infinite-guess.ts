import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  WordsInfiniteGuessPayload,
  WordsInfiniteRunResponse,
} from "../../types/words";

export const useSubmitInfiniteGuessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    WordsInfiniteRunResponse,
    Error,
    WordsInfiniteGuessPayload
  >({
    mutationFn: async (payload: WordsInfiniteGuessPayload) => {
      const { data } = await axios.post<WordsInfiniteRunResponse>(
        WORDS_ENDPOINTS.infiniteRunGuess,
        payload,
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["words-infinite-run"], data);
    },
  });
};
