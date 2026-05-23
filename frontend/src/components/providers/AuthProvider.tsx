"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  authApi,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "../../lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  onboard: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const publicRoutes = ["/login", "/signup"];

  // React Query to manage current user profile
  const {
    data: user = null,
    isLoading: isUserLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        return null;
      }

      try {
        // Fetch user profile; the API client's response interceptor will
        // automatically handle token refresh if the access token has expired.
        return await authApi.getMe();
      } catch (err) {
        setAccessToken(null);
        setRefreshToken(null);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
  });

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: any) => {
      await authApi.login(email, password);
    },
    onSuccess: async () => {
      await refetch();
    },
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: any) => {
      await authApi.register(email, password);
      await authApi.login(email, password);
    },
    onSuccess: async () => {
      await refetch();
    },
  });

  // Onboard Mutation
  const onboardMutation = useMutation({
    mutationFn: async (fullName: string) => {
      return await authApi.onboard(fullName);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["auth-user"], updatedUser);
      router.replace("/");
    },
  });

  // Combine query and mutation loading states
  const loading =
    isUserLoading ||
    loginMutation.isPending ||
    registerMutation.isPending ||
    onboardMutation.isPending;

  // Handle route protection and redirects
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = publicRoutes.includes(pathname || "");

    if (!user) {
      if (!isPublicRoute) {
        router.replace("/login");
      }
    } else {
      // Redirect regular users if they attempt to load the admin dashboard
      if (pathname === "/dashboard" && !user.is_admin) {
        router.replace("/");
        return;
      }

      if (!user.onboarded) {
        if (pathname !== "/onboarding") {
          router.replace("/onboarding");
        }
      } else {
        if (isPublicRoute || pathname === "/onboarding") {
          router.replace("/");
        }
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string) => {
    await registerMutation.mutateAsync({ email, password });
  };

  const logout = () => {
    authApi.logout();
    queryClient.setQueryData(["auth-user"], null);
    router.push("/login");
  };

  const onboard = async (fullName: string) => {
    await onboardMutation.mutateAsync(fullName);
  };

  const isPublicRoute = publicRoutes.includes(pathname || "");

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070708] text-zinc-100 flex-col space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-[120px] h-[120px] bg-emerald-400/10 rounded-full blur-[40px] animate-pulse" />
          <div className="w-10 h-10 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <span className="text-xs tracking-widest text-zinc-500 font-light uppercase animate-pulse">
          Initializing OliveBot...
        </span>
      </div>
    );
  }

  // Prevent flash of protected content during redirection
  if (!isPublicRoute && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070708]">
        <div className="w-10 h-10 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prevent flash of admin dashboard content for non-admins during redirect
  if (pathname === "/dashboard" && user && !user.is_admin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070708]">
        <div className="w-10 h-10 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prevent flash of onboarding if user is logged in but hasn't completed it
  if (user && !user.onboarded && pathname !== "/onboarding") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070708]">
        <div className="w-10 h-10 border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, onboard }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
