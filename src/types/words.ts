import type { User } from "../contexts/auth-context";
import type { AvatarConfig } from "./avatar";

export type WordsHistoryStatus = "won" | "lost" | "abandoned" | "in_progress";

export type WordsHistoryGuess = {
  attemptNumber: number;
  guessWord: string;
  pattern: string;
  createdAt: string;
};

export type WordsHistoryItem = {
  userPuzzleId: string;
  puzzleId: string;
  puzzleWord: string;
  date: string;
  status: WordsHistoryStatus;
  attemptsUsed: number;
  maxAttempts: number;
  score: number;
  guesses: WordsHistoryGuess[];
  createdAt: string;
  finishedAt?: string;
};

export type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: T[];
};

export type WordsHistoryQueryParams = {
  page?: number;
  pageSize?: number;
};

export type WordsHistoryPayload = {
  puzzleId: string;
  status: WordsHistoryStatus;
  attemptsUsed: number;
  maxAttempts?: number;
  score?: number;
  finishedAt?: string;
  guesses: WordsHistoryGuess[];
};

export type WordsHistoryResponse = PaginatedResponse<WordsHistoryItem>;

export type WordsHistoryMutationResponse = {
  user: User;
  historyItem: WordsHistoryItem;
};

export type WordsPuzzle = {
  puzzleId: string;
  puzzleWord: string;
  date: string;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  dailyId?: string;
};

export type WordsPuzzlesQueryParams = {
  page?: number;
  pageSize?: number;
};

export type WordsPuzzlesResponse = PaginatedResponse<WordsPuzzle>;

export type CreateWordsPuzzlePayload = {
  date: string;
  puzzleWord: string;
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
};

export type DailyGuessLetterState = "absent" | "present" | "correct";

export type DailyGuessLetter = {
  letter: string;
  state: DailyGuessLetterState;
};

export type DailyGuessAttempt = {
  attemptNumber: number;
  letters: DailyGuessLetter[];
  pattern: string;
};

export type DailyPuzzleGuess = DailyGuessAttempt & {
  guessWord: string;
  createdAt: string;
};

export type DailyPuzzleStatus = "in_progress" | "won" | "lost";

export type DailyPuzzleResponse = {
  puzzleId: string;
  dailyId: string;
  date: string;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  puzzle: {
    id: string;
    dailyId: string;
    date: string;
    maxAttempts: number;
  };
  status: DailyPuzzleStatus;
  attemptsUsed: number;
  remainingAttempts: number;
  finishedAt: string | null;
  scoreAwarded: number;
  guesses: DailyPuzzleGuess[];
};

export type DailyGuessPayload = {
  guessWord: string;
  dailyId?: string;
  date?: string;
};

export type DailyGuessResponse = {
  puzzle: {
    id: string;
    date: string;
    dailyId: string;
    maxAttempts: number;
  };
  attempt: DailyGuessAttempt;
  status: DailyPuzzleStatus;
  attemptsUsed: number;
  remainingAttempts: number;
  finishedAt: string | null;
  scoreAwarded: number;
  userScore: number;
};

export type WordsRankingItem = {
  id: string;
  name: string;
  streak: number;
  score: number;
  avatar?: AvatarConfig;
};

export type InfiniteRandomWordResponse = {
  word: string;
};

export type InfiniteWordsQueryParams = {
  page?: number;
  pageSize?: number;
};

export type InfiniteWordsResponse = PaginatedResponse<string>;
