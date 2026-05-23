import { apiClient, setAccessToken, setRefreshToken } from "./apiClient";
import { User, TokenResponse } from "../types";

export const authApi = {
  register: async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post<User>("/api/v1/auth/register", { email, password });
    return response.data;
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>("/api/v1/auth/login", { email, password });
    setAccessToken(response.data.access_token);
    setRefreshToken(response.data.refresh_token);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>("/api/v1/auth/me");
    return response.data;
  },

  onboard: async (fullName: string): Promise<User> => {
    const response = await apiClient.post<User>("/api/v1/auth/onboard", { full_name: fullName });
    return response.data;
  },

  logout: () => {
    setAccessToken(null);
    setRefreshToken(null);
  },
};
