import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  InfiniteWordsQueryParams,
  InfiniteWordsResponse,
} from "../../types/words";

type UseInfiniteWordsOptions = Omit<
  UseQueryOptions<InfiniteWordsResponse, Error>,
  "queryKey" | "queryFn"
>;

const normalizeParams = (params?: InfiniteWordsQueryParams) => ({
  page: params?.page ?? 1,
  pageSize: params?.pageSize ?? 100,
});

export const useInfiniteWordsQuery = (
  params?: InfiniteWordsQueryParams,
  options?: UseInfiniteWordsOptions,
) => {
  const normalized = normalizeParams(params);

  return useQuery<InfiniteWordsResponse, Error>({
    queryKey: ["words-infinite-words", normalized.page, normalized.pageSize],
    queryFn: async () => {
      const { data } = await axios.get<InfiniteWordsResponse>(
        WORDS_ENDPOINTS.infiniteWords,
        { params: normalized },
      );

      return data;
    },
    ...options,
  });
};
