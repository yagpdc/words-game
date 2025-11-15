import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MutationFunctionContext,
  UseMutationOptions,
} from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type {
  WordsHistoryMutationResponse,
  WordsHistoryPayload,
} from "../../types/words";

type UseCreateHistoryOptions = Omit<
  UseMutationOptions<
    WordsHistoryMutationResponse,
    Error,
    WordsHistoryPayload,
    unknown
  >,
  "mutationFn"
>;

export const useCreateWordsHistoryMutation = (
  options?: UseCreateHistoryOptions,
) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};

  return useMutation<
    WordsHistoryMutationResponse,
    Error,
    WordsHistoryPayload,
    unknown
  >({
    mutationFn: async (payload) => {
      const { data } = await axios.post<WordsHistoryMutationResponse>(
        WORDS_ENDPOINTS.history,
        payload,
      );

      return data;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["words-history"] });
      queryClient.invalidateQueries({ queryKey: ["words-profile"] });

      if (onSuccess) {
        onSuccess(
          data,
          variables,
          undefined,
          context as MutationFunctionContext,
        );
      }
    },
    ...rest,
  });
};
