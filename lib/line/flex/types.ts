import type { HealthReport, TimedVitalsSample } from "@/lib/health-report";

export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
};

export type FlexTemplateContext =
  | "bloodPressure"
  | "heartRate"
  | "temperature"
  | "spo2"
  | "meal"
  | "medication"
  | "billing"
  | "healthReport"
  | "simpleText";

export type SupabaseMessageContext =
  | "health_report"
  | "vital_signs"
  | "medication"
  | "meal"
  | "mood_behavior"
  | "excretion"
  | "billing"
  | "activity"
  | "general_chat"
  | "other";

export type SupabaseFlexTemplate =
  | "health_report_summary"
  | "vital_signs_card"
  | "medication_card"
  | "meal_card"
  | "mood_behavior_card"
  | "excretion_card"
  | "billing_notice"
  | "activity_card"
  | "plain_text";

export type FlexTemplateInput = {
  text: string;
  report: HealthReport;
  timedSamples: TimedVitalsSample[];
  reportUrl: string;
  imageUrl?: string | null;
  groupName?: string | null;
};

export type FlexBox = Record<string, unknown>;
