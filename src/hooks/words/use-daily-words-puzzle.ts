import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { DailyPuzzleResponse } from "../../types/words";

type UseDailyPuzzleOptions = Omit<
  UseQueryOptions<DailyPuzzleResponse, Error>,
  "queryKey" | "queryFn"
>;

export const useDailyWordsPuzzleQuery = (
  date?: string,
  options?: UseDailyPuzzleOptions,
) => {
  return useQuery<DailyPuzzleResponse, Error>({
    queryKey: ["words-daily-puzzle", date ?? "today"],
    queryFn: async () => {
      const { data } = await axios.get<DailyPuzzleResponse>(
        WORDS_ENDPOINTS.dailyPuzzle,
        {
          params: date ? { date } : undefined,
        },
      );

      return data;
    },
    ...options,
  });
};
