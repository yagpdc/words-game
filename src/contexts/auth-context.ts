import { createContext } from "react";

export type UserAchievements = {
  "30_STREAK_INFINITY"?: boolean;
};

export type User = {
  id: string;
  name: string;
  streak: number;
  score: number;
  config: Record<string, unknown>;
  infiniteRecord?: number;
  infiniteCurrentScore?: number;
  infiniteStatus?: "idle" | "active" | "failed" | "completed";
  achievements?: UserAchievements;
  createdAt: string;
  updatedAt: string;
};

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, authHeader: string) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<User>) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
