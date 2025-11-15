import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { WordsRankingItem } from "../../types/words";

type UseWordsRankingOptions = Omit<
  UseQueryOptions<WordsRankingItem[], Error>,
  "queryKey" | "queryFn"
>;

export const useWordsRankingQuery = (options?: UseWordsRankingOptions) => {
  return useQuery<WordsRankingItem[], Error>({
    queryKey: ["words-ranking"],
    queryFn: async () => {
      const { data } = await axios.get<WordsRankingItem[]>(
        WORDS_ENDPOINTS.ranking,
      );

      return data;
    },
    staleTime: 30_000,
    ...options,
  });
};
