export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  model: string;
  provider: string;
  latency_ms: number;
  total_tokens: number;
  status_code: number;
  error_message: string | null;
  input_preview: string;
  output_preview: string;
  timestamp: string;
}

export interface TrendPoint {
  time: string;
  requests: number;
  latency: number;
  tokens: number;
}

export interface MetricSummary {
  avg_latency_ms: number;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  error_rate: number;
  error_count: number;
}

export interface DashboardData {
  summary: MetricSummary;
  trends: TrendPoint[];
  models: { name: string; value: number }[];
  providers: { name: string; value: number }[];
  logs: LogEntry[];
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  onboarded: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
