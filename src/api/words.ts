export const WORDS_API_BASE_URL = "http://localhost:8000/words";

export const WORDS_ENDPOINTS = {
  profile: `${WORDS_API_BASE_URL}/profile`,
  history: `${WORDS_API_BASE_URL}/history`,
  ranking: `${WORDS_API_BASE_URL}/ranking`,
  puzzles: `${WORDS_API_BASE_URL}/puzzles`,
  dailyPuzzle: `${WORDS_API_BASE_URL}/puzzles/daily`,
  infiniteRandom: `${WORDS_API_BASE_URL}/infinite/random`,
  infiniteWords: `${WORDS_API_BASE_URL}/infinite/words`,
} as const;
