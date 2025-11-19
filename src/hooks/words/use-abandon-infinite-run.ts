import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { WordsInfiniteRunResponse } from "../../types/words";

export const useAbandonInfiniteRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<WordsInfiniteRunResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await axios.post<WordsInfiniteRunResponse>(
        WORDS_ENDPOINTS.infiniteRunAbandon,
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["words-infinite-run"], data);
    },
  });
};
