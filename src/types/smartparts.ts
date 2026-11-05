/**
 * SmartParts - Agentic AI Workshop Parts Desk
 * Core TypeScript Interfaces and Domain Models
 */

export type PartCategory = 'Motor' | 'Power Supply' | 'Driver' | 'Solenoid' | 'Microcontroller' | 'Sensor';

export type VerificationStatus = 'Verified' | 'Needs Verification' | 'Uncertain';

export interface Part {
  id: string;
  name: string;
  category: PartCategory | string;
  voltage_nominal_v: number;
  voltage_min_v: number;
  voltage_max_v: number;
  current_draw_a: number;
  power_rating_w: number;
  connector_type: string;
  pinout_polarity: string;
  stock_quantity: number;
  price_usd: number;
  bin_location: string;
  safety_cert: string;
  verification_status: VerificationStatus;
  last_updated: string;
  spec_summary: string;
}

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStage {
  stage_id: number;
  name: string;
  status: StageStatus;
  explanation: string;
  elapsed_ms?: number;
  tool_calls?: {
    tool_name: string;
    arguments: Record<string, any>;
    result: any;
    cost_usd: number;
  }[];
  result?: any;
  warnings?: string[];
}

export type RequestStatus = 'pending' | 'processing' | 'matched' | 'needs_clarification' | 'rejected' | 'failed';

export interface ExtractedSpecs {
  raw_request: string;
  category?: string | null;
  voltage_v?: number | null;
  connector_type?: string | null;
  power_w?: number | null;
  current_a?: number | null;
  missing_fields: string[];
  confidence: number;
}

export interface WorkshopRequest {
  id: string;
  customer_request: string;
  status: RequestStatus;
  timestamp: string;
  requirements: ExtractedSpecs;
  candidate_parts?: Part[];
  selected_part?: Part | null;
  decision_reason?: string;
  risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  verification_token?: string | null;
  budget_spent_usd: number;
  remaining_budget_usd: number;
  stages: WorkflowStage[];
  warehouse_slip?: {
    dispatch_id: string;
    part_id: string;
    part_name: string;
    bin_location: string;
    voltage: string;
    connector: string;
    power: string;
    verification_token: string;
    safety_cert: string;
    order_notes: string;
    timestamp: string;
    status: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  specs?: ExtractedSpecs;
  matchedParts?: {
    part: Part;
    compatibility_status: 'Compatible' | 'Incompatible' | 'Needs Verification' | 'Out of Stock' | 'Requires Clarification';
    confidence?: number;
    explanation: string;
    inventory_verified: boolean;
    uncertainty_flag?: string;
  }[];
  clarification_needed?: boolean;
  suggested_replies?: string[];
}

export interface AgentActivityEvent {
  id: string;
  timestamp: string;
  type: 'request_received' | 'tool_executed' | 'invariants_verified' | 'part_dispatched' | 'human_escalation' | 'clarification_asked';
  title: string;
  details: string;
  requestId?: string;
  cost_usd?: number;
  badge?: string;
}

export interface AnalyticsData {
  total_requests: number;
  matched_parts: number;
  pending_requests: number;
  clarification_requests: number;
  incompatible_parts: number;
  low_stock_alerts: number;
  uncertain_inventory_records: number;
  agent_success_rate: number;
  average_processing_time_ms: number;
  total_tool_calls: number;
  budget_spent_usd: number;
  remaining_budget_usd: number;
  status_distribution: { name: string; count: number; color: string }[];
  category_distribution: { category: string; count: number }[];
  recent_activities: AgentActivityEvent[];
}

export interface AppSettings {
  backendUrl: string;
  isDemoMode: boolean;
  maxBudgetUsd: number;
  temperature: number;
  autoOpenChatbot: boolean;
  showToolBudget: boolean;
  strictSafetyMode: boolean;
}
