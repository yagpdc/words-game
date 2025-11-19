const LOCAL_API_URL = "http://localhost:8000";
const PROD_API_URL =
  "https://yago-vm-web-test-ffhjembcd5h9eebv.brazilsouth-01.azurewebsites.net";

const API_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORDS_API_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.PROD
    ? PROD_API_URL
    : LOCAL_API_URL);

export const WORDS_API_BASE_URL = `${API_ORIGIN}/words`;

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
} as const;
