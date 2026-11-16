export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

export interface CrawledPageData {
  url: string;
  status_code: number;
  title: string;
  meta_description: string;
  metadata: Record<string, any>;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  paragraphs: string[];
  total_paragraphs: number;
  links_sample: Array<{ url: string; text: string; type: string }>;
  total_links: number;
  response_time_ms: number;
  depth: number;
  json_ld_count: number;
}

export interface CrawlStructuredResult {
  target_url: string;
  base_domain: string;
  pages_crawled_count: number;
  max_pages_requested: number;
  max_depth_requested: number;
  total_crawl_time_seconds: number;
  pages: CrawledPageData[];
  errors: any[];
  crawled_at: string;
}

export interface StructuredMessageData {
  summary: string;
  structured_json: CrawlStructuredResult;
  pages_crawled: number;
  target_url: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structured_data?: StructuredMessageData | null;
  execution_id?: string | null;
  created_at: string;
}

export interface TimelineEvent {
  execution_id: string;
  event_type: string;
  message: string;
  step_index?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: Record<string, any>;
  timestamp: string;
  timestamp_iso?: string;
}

export interface TaskExecution {
  id: string;
  session_id?: string | null;
  user_prompt: string;
  detected_intent?: any;
  execution_plan?: any[];
  selected_tool?: string;
  validated_arguments?: {
    url?: string;
    max_pages?: number;
    depth?: number;
  };
  process_start_time?: string;
  process_completion_time?: string;
  execution_duration_seconds?: number;
  stdout: string;
  stderr: string;
  exit_code?: number;
  execution_status: 'Running' | 'Completed' | 'Failed' | 'Partially completed' | 'Timed out' | 'Cancelled' | 'Pending';
  pages_crawled: number;
  final_output?: StructuredMessageData | null;
  error_message?: string | null;
  timeline_events: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface CrawlConfig {
  max_pages: number;
  depth: number;
}
