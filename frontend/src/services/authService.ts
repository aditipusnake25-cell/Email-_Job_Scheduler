import { api } from "./api";
import { User } from "../types/user";

export const authService = {
  setToken(token: string): void {
    localStorage.setItem("reachinbox_token", token);
  },

  getToken(): string | null {
    return localStorage.getItem("reachinbox_token");
  },

  removeToken(): void {
    localStorage.removeItem("reachinbox_token");
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await api.get<{ success: boolean; user: User }>("/api/auth/me");
      return res.data.user;
    } catch {
      return null;
    }
  },

  async devLogin(email?: string, name?: string): Promise<{ user: User; token: string }> {
    const res = await api.post<{ success: boolean; user: User; token: string }>("/api/auth/dev-login", {
      email,
      name,
    });
    this.setToken(res.data.token);
    return { user: res.data.user, token: res.data.token };
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } finally {
      this.removeToken();
    }
  },

  getGoogleAuthUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${baseUrl}/api/auth/google`;
  },
};
