import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../lib/api";

export function useConversationsQuery() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatApi.getConversations(),
  });
}

export function useConversationMessagesQuery(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => {
      if (!conversationId) return [];
      return chatApi.getConversationMessages(conversationId);
    },
    enabled: !!conversationId,
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
