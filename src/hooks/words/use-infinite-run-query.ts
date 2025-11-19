import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { WordsInfiniteRunResponse } from "../../types/words";

type UseInfiniteRunOptions = Omit<
  UseQueryOptions<WordsInfiniteRunResponse | null, Error>,
  "queryKey" | "queryFn"
>;

export const useWordsInfiniteRunQuery = (
  options?: UseInfiniteRunOptions,
) => {
  return useQuery<WordsInfiniteRunResponse | null, Error>({
    queryKey: ["words-infinite-run"],
    queryFn: async () => {
      try {
        const { data } = await axios.get<WordsInfiniteRunResponse>(
          WORDS_ENDPOINTS.infiniteRun,
        );

        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    ...options,
  });
};
