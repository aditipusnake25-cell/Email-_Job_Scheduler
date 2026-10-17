export interface User {
  id: string;
  google_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
