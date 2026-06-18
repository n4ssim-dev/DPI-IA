import { createContext } from "react";
import type { Utilisateur } from "../types";

export interface AuthContextValue {
  user: Utilisateur | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
