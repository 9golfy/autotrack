import type { FlexTemplateContext, SupabaseFlexTemplate, SupabaseMessageContext } from "./types";

export const SUPABASE_MESSAGE_CONTEXTS = [
  "health_report",
  "vital_signs",
  "medication",
  "meal",
  "mood_behavior",
  "excretion",
  "billing",
  "activity",
  "general_chat",
  "other",
] as const satisfies readonly SupabaseMessageContext[];

export const FLEX_TEMPLATE_BY_SUPABASE_CONTEXT = {
  health_report: "health_report_summary",
  vital_signs: "vital_signs_card",
  medication: "medication_card",
  meal: "meal_card",
  mood_behavior: "mood_behavior_card",
  excretion: "excretion_card",
  billing: "billing_notice",
  activity: "activity_card",
  general_chat: "plain_text",
  other: "plain_text",
} as const satisfies Record<SupabaseMessageContext, SupabaseFlexTemplate>;

const FLEX_CONTEXT_BY_TEMPLATE: Record<string, FlexTemplateContext> = {
  health_report_summary: "healthReport",
  vital_signs_card: "healthReport",
  medication_card: "medication",
  medication_reminder: "medication",
  meal_card: "meal",
  meal_summary: "meal",
  mood_behavior_card: "simpleText",
  mood_behavior_summary: "simpleText",
  excretion_card: "simpleText",
  excretion_summary: "simpleText",
  billing_notice: "billing",
  activity_card: "simpleText",
  activity_summary: "simpleText",
  plain_text: "simpleText",
  simple_text: "simpleText",
};

const CONTEXT_PATTERNS: Array<{ context: SupabaseMessageContext; pattern: RegExp }> = [
  {
    context: "billing",
    pattern: /\u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22|\u0e0a\u0e33\u0e23\u0e30|\u0e42\u0e2d\u0e19|\u0e1a\u0e34\u0e25|\u0e43\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e2b\u0e19\u0e35\u0e49|invoice|payment/i,
  },
  {
    context: "medication",
    pattern: /\u0e22\u0e32|\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e2d\u0e19|\u0e2b\u0e25\u0e31\u0e07\u0e2d\u0e32\u0e2b\u0e32\u0e23|\u0e01\u0e48\u0e2d\u0e19\u0e2d\u0e32\u0e2b\u0e32\u0e23|medicine|medication/i,
  },
  {
    context: "meal",
    pattern: /\u0e2d\u0e32\u0e2b\u0e32\u0e23|\u0e21\u0e37\u0e49\u0e2d\u0e40\u0e0a\u0e49\u0e32|\u0e21\u0e37\u0e49\u0e2d\u0e01\u0e25\u0e32\u0e07\u0e27\u0e31\u0e19|\u0e21\u0e37\u0e49\u0e2d\u0e40\u0e22\u0e47\u0e19|\u0e17\u0e32\u0e19\u0e02\u0e49\u0e32\u0e27|\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e17\u0e32\u0e19|meal|food/i,
  },
  {
    context: "mood_behavior",
    pattern: /\u0e2d\u0e32\u0e23\u0e21\u0e13\u0e4c|\u0e2b\u0e07\u0e38\u0e14\u0e2b\u0e07\u0e34\u0e14|\u0e22\u0e34\u0e49\u0e21\u0e41\u0e22\u0e49\u0e21|\u0e0b\u0e36\u0e21|\u0e23\u0e39\u0e49\u0e2a\u0e36\u0e01\u0e15\u0e31\u0e27|mood|behavior/i,
  },
  {
    context: "excretion",
    pattern: /\u0e1b\u0e31\u0e2a\u0e2a\u0e32\u0e27\u0e30|\u0e02\u0e31\u0e1a\u0e16\u0e48\u0e32\u0e22|urine|stool|bowel/i,
  },
  {
    context: "activity",
    pattern: /\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21|\u0e40\u0e14\u0e34\u0e19|\u0e40\u0e25\u0e48\u0e19|\u0e1a\u0e34\u0e07\u0e42\u0e01|\u0e42\u0e22\u0e19\u0e1a\u0e2d\u0e25|activity|exercise/i,
  },
];

const FLEX_PATTERNS: Array<{ context: FlexTemplateContext; pattern: RegExp }> = [
  { context: "billing", pattern: CONTEXT_PATTERNS[0].pattern },
  { context: "medication", pattern: CONTEXT_PATTERNS[1].pattern },
  { context: "meal", pattern: CONTEXT_PATTERNS[2].pattern },
  { context: "spo2", pattern: /\u0e2d\u0e2d\u0e01\u0e0b\u0e34\u0e40\u0e08\u0e19|oxygen|spo2/i },
  { context: "temperature", pattern: /\u0e2d\u0e38\u0e13\u0e2b\u0e20\u0e39\u0e21\u0e34|temperature|\u0e2d\u0e07\u0e28\u0e32/i },
  { context: "heartRate", pattern: /\u0e0a\u0e35\u0e1e\u0e08\u0e23|\u0e2b\u0e31\u0e27\u0e43\u0e08|heart|bpm/i },
  { context: "bloodPressure", pattern: /\u0e04\u0e27\u0e32\u0e21\u0e14\u0e31\u0e19|bp|mmhg|mmgh/i },
];

export function getFlexTemplateForSupabaseContext(context: SupabaseMessageContext): SupabaseFlexTemplate {
  return FLEX_TEMPLATE_BY_SUPABASE_CONTEXT[context];
}

export function getFlexContextForSupabaseTemplate(template: string | null | undefined): FlexTemplateContext {
  return template ? FLEX_CONTEXT_BY_TEMPLATE[template] ?? "simpleText" : "simpleText";
}

export function detectSupabaseMessageContexts(input: {
  text: string;
  hasTimedVitals: boolean;
}): SupabaseMessageContext[] {
  const contexts = new Set<SupabaseMessageContext>();

  if (input.hasTimedVitals) {
    contexts.add("health_report");
    contexts.add("vital_signs");
  }

  for (const entry of CONTEXT_PATTERNS) {
    if (entry.pattern.test(input.text)) {
      contexts.add(entry.context);
    }
  }

  if (contexts.size === 0) {
    contexts.add("general_chat");
  }

  return SUPABASE_MESSAGE_CONTEXTS.filter((context) => contexts.has(context));
}

export function detectLineFlexTemplateContext(input: {
  text: string;
  hasTimedVitals: boolean;
}): FlexTemplateContext {
  // 1. ให้ความสำคัญสูงสุดกับ Health Report (ถ้ามีข้อมูลสัญญาณชีพหลายช่วงเวลา)
  if (input.hasTimedVitals) {
    return "healthReport";
  }

  // 2. ถ้าไม่มีข้อมูลหลายเวลา ค่อยแยกตามประเภทคำสำคัญ
  for (const entry of FLEX_PATTERNS) {
    if (entry.pattern.test(input.text)) {
      return entry.context;
    }
  }

  return "simpleText";
}
