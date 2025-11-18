import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { User } from "../../contexts/auth-context";
import type { AvatarUpdatePayload } from "../../types/avatar";

type UseUpdateAvatarOptions = UseMutationOptions<
  User,
  Error,
  AvatarUpdatePayload
>;

export const useUpdateAvatarConfig = (options?: UseUpdateAvatarOptions) => {
  return useMutation<User, Error, AvatarUpdatePayload>({
    mutationFn: async (payload: AvatarUpdatePayload) => {
      const { data } = await axios.put<User>(
        WORDS_ENDPOINTS.profileAvatar,
        payload,
      );

      return data;
    },
    ...options,
  });
};
