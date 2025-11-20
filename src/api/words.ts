const LOCAL_API_URL = "http://localhost:8000";
const PROD_API_URL =
  "https://yago-vm-web-test-ffhjembcd5h9eebv.brazilsouth-01.azurewebsites.net";

const API_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORDS_API_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.PROD
    ? PROD_API_URL
    : LOCAL_API_URL);

export const WORDS_API_ORIGIN = API_ORIGIN;
export const WORDS_API_BASE_URL = `${API_ORIGIN}/words`;

export const WORDS_SOCKET_URL = API_ORIGIN;

export const WORDS_ENDPOINTS = {
  profile: `${WORDS_API_BASE_URL}/profile`,
  profileAvatar: `${WORDS_API_BASE_URL}/profile/avatar`,
  history: `${WORDS_API_BASE_URL}/history`,
  ranking: `${WORDS_API_BASE_URL}/ranking`,
  puzzles: `${WORDS_API_BASE_URL}/puzzles`,
  dailyPuzzle: `${WORDS_API_BASE_URL}/puzzles/daily`,
  infiniteRun: `${WORDS_API_BASE_URL}/infinite/run`,
  infiniteRunGuess: `${WORDS_API_BASE_URL}/infinite/run/guess`,
  infiniteRunAbandon: `${WORDS_API_BASE_URL}/infinite/run/abandon`,
  // Co-op endpoints
  coopCreateRoom: `${WORDS_API_BASE_URL}/infinity/coop/create-room`,
  coopJoinRoom: (roomId: string) => `${WORDS_API_BASE_URL}/infinity/coop/join-room/${roomId}`,
  coopRoomStatus: (roomId: string) => `${WORDS_API_BASE_URL}/infinity/coop/room/${roomId}`,
  coopMyRoom: `${WORDS_API_BASE_URL}/infinity/coop/my-room`,
  coopGuess: `${WORDS_API_BASE_URL}/infinity/coop/guess`,
  coopAbandon: `${WORDS_API_BASE_URL}/infinity/coop/abandon`,
  coopLeaveRoom: `${WORDS_API_BASE_URL}/infinity/coop/leave-room`,
  coopForceLeave: `${WORDS_API_BASE_URL}/infinity/coop/force-leave`,
} as const;
