import { createContext, useContext } from 'react';
import type { LocalUser } from '../services/api';

export interface Session {
  token: string | null;
  user: (LocalUser & { isAdmin: boolean }) | null;
  logout: () => void;
}
export const SessionContext = createContext<Session>({ token: null, user: null, logout: () => {} });
export const useSession = () => useContext(SessionContext);
