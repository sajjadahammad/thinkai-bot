import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../lib/api";

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboardMetrics"],
    queryFn: () => chatApi.getDashboardMetrics(),
    refetchInterval: 10000, // Refetch metrics every 10 seconds for real-time telemetry updates
  });
}
