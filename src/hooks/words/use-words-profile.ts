import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { UseQueryOptions } from "@tanstack/react-query";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { User } from "../../contexts/auth-context";

type UseWordsProfileOptions = Omit<
  UseQueryOptions<User, Error>,
  "queryKey" | "queryFn"
>;

export const useWordsProfileQuery = (options?: UseWordsProfileOptions) => {
  return useQuery<User, Error>({
    queryKey: ["words-profile"],
    queryFn: async () => {
      const { data } = await axios.get<User>(WORDS_ENDPOINTS.profile);
      return data;
    },
    ...options,
  });
};
