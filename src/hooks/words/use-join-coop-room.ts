import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { WORDS_ENDPOINTS } from "../../api/words";
import type { JoinRoomResponse } from "../../types/words";

export const useJoinCoopRoom = () => {
  return useMutation({
    mutationFn: async (roomId: string): Promise<JoinRoomResponse> => {
      const response = await axios.post(
        WORDS_ENDPOINTS.coopJoinRoom(roomId),
        {},
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
};
