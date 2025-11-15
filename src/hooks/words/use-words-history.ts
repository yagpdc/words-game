import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  WordsHistoryQueryParams,
  WordsHistoryResponse,
} from "../../types/words";

type UseWordsHistoryOptions = Omit<
  UseQueryOptions<WordsHistoryResponse, Error>,
  "queryKey" | "queryFn"
>;

const normalizeParams = (params?: WordsHistoryQueryParams) => ({
  page: params?.page ?? 1,
  pageSize: params?.pageSize ?? 10,
});

export const useWordsHistoryQuery = (
  params?: WordsHistoryQueryParams,
  options?: UseWordsHistoryOptions,
) => {
  const normalized = normalizeParams(params);

  return useQuery<WordsHistoryResponse, Error>({
    queryKey: ["words-history", normalized.page, normalized.pageSize],
    queryFn: async () => {
      const { data } = await axios.get<WordsHistoryResponse>(
        WORDS_ENDPOINTS.history,
        {
          params: normalized,
        },
      );

      return data;
    },
    ...options,
  });
};
