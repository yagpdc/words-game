import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { CreateRoomResponse } from "../../types/words";

export const useCreateCoopRoom = () => {
  return useMutation({
    mutationFn: async (): Promise<CreateRoomResponse> => {
      const response = await axios.post(
        WORDS_ENDPOINTS.coopCreateRoom,
        {},
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
};
