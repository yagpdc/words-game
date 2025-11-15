import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { InfiniteRandomWordResponse } from "../../types/words";

type UseRandomWordOptions = Omit<
  UseQueryOptions<InfiniteRandomWordResponse, Error>,
  "queryKey" | "queryFn"
>;

export const useRandomInfiniteWordQuery = (
  options?: UseRandomWordOptions,
) => {
  return useQuery<InfiniteRandomWordResponse, Error>({
    queryKey: ["words-infinite-random"],
    queryFn: async () => {
      const { data } = await axios.get<InfiniteRandomWordResponse>(
        WORDS_ENDPOINTS.infiniteRandom,
      );

      return data;
    },
    ...options,
  });
};
