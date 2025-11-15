import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MutationFunctionContext,
  UseMutationOptions,
} from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { CreateWordsPuzzlePayload, WordsPuzzle } from "../../types/words";

type UseCreatePuzzleOptions = Omit<
  UseMutationOptions<WordsPuzzle, Error, CreateWordsPuzzlePayload, unknown>,
  "mutationFn"
>;

export const useCreateWordsPuzzleMutation = (
  options?: UseCreatePuzzleOptions,
) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};

  return useMutation<WordsPuzzle, Error, CreateWordsPuzzlePayload, unknown>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<WordsPuzzle>(
        WORDS_ENDPOINTS.puzzles,
        payload,
      );

      return data;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["words-puzzles"] });
      queryClient.invalidateQueries({ queryKey: ["words-daily-puzzle"] });

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
