import { createContext } from "react";

export type User = {
  id: string;
  name: string;
  streak: number;
  score: number;
  config: Record<string, unknown>;
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
