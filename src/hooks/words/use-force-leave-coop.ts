import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";

export const useForceLeaveCoopRoom = () => {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await axios.post(
        WORDS_ENDPOINTS.coopForceLeave,
        {},
        {
          withCredentials: true,
        }
      );
    },
  });
};
