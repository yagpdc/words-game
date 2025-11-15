import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  WordsPuzzlesQueryParams,
  WordsPuzzlesResponse,
} from "../../types/words";

type UseWordsPuzzlesOptions = Omit<
  UseQueryOptions<WordsPuzzlesResponse, Error>,
  "queryKey" | "queryFn"
>;

const normalizeParams = (params?: WordsPuzzlesQueryParams) => ({
  page: params?.page ?? 1,
  pageSize: params?.pageSize ?? 20,
});

export const useWordsPuzzlesQuery = (
  params?: WordsPuzzlesQueryParams,
  options?: UseWordsPuzzlesOptions,
) => {
  const normalized = normalizeParams(params);

  return useQuery<WordsPuzzlesResponse, Error>({
    queryKey: ["words-puzzles", normalized.page, normalized.pageSize],
    queryFn: async () => {
      const { data } = await axios.get<WordsPuzzlesResponse>(
        WORDS_ENDPOINTS.puzzles,
        {
          params: normalized,
        },
      );

      return data;
    },
    ...options,
  });
};
