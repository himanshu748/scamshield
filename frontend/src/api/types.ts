export type Scenario = "high-risk" | "needs-context" | "low-risk";
export type RiskLevel = "high_risk" | "needs_context" | "low_risk";

export interface MessageRequest {
  sender_confirmed?: boolean;
  channel: "sms" | "email" | "chat";
  sender: string;
  content: string;
  received_at: string;
}

export interface Claim {
  id: string;
  kind: string;
  text: string;
  provenance: string;
}

export interface EvidenceCheck {
  id: string;
  label: string;
  finding: string;
  source: string;
  result: "risky" | "safe" | "unknown";
}

export interface ScamCase {
  id: string;
  status: "waiting_for_approval" | "report_generated" | "report_rejected";
  approval_id: string;
  request: MessageRequest;
  redacted_sender: string;
  redacted_content: string;
  claims: Claim[];
  checks: EvidenceCheck[];
  assessment: {
    level: RiskLevel;
    score: number;
    confidence: "high" | "medium" | "low";
    reasons: string[];
    safety_steps: string[];
  };
  advice: { summary: string; prioritized_check_ids: string[] };
  events: Array<{ kind: string; summary: string; created_at: string }>;
  report: string | null;
}
