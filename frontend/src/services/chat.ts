import { apiClient } from "./apiClient";
import { Conversation, Message, DashboardData } from "../types";

export const chatApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>("/api/v1/conversations");
    return response.data;
  },

  getConversationMessages: async (id: string): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(`/api/v1/conversations/${id}/messages`);
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/conversations/${id}`);
  },

  getDashboardMetrics: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>("/api/v1/dashboard/metrics");
    return response.data;
  },
};
