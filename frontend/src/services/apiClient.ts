import axios from "axios";
import { TokenResponse } from "../types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refresh_token");
  }
  return null;
};

export const setRefreshToken = (token: string | null) => {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("refresh_token", token);
    } else {
      localStorage.removeItem("refresh_token");
    }
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    if (response && response.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url === "/api/v1/auth/refresh" ||
        originalRequest.url === "/api/v1/auth/login" ||
        originalRequest.url === "/api/v1/auth/register"
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      const refresh = getRefreshToken();

      if (!refresh) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post<TokenResponse>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refresh }
        );
        const { access_token, refresh_token } = res.data;

        setAccessToken(access_token);
        setRefreshToken(refresh_token);
        isRefreshing = false;
        onRefreshed(access_token);

        originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        setAccessToken(null);
        setRefreshToken(null);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
