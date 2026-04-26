import { buildBloodPressureFlex, buildHealthReportSummaryFlex } from "./blood-pressure";
import { buildBillingFlex } from "./billing";
import { detectLineFlexTemplateContext } from "./context";
import { buildHeartRateFlex } from "./heart-rate";
import { buildMealFlex } from "./meal";
import { buildMedicationFlex } from "./medication";
import { buildSimpleTextFlex } from "./simple-text";
import { buildSpo2Flex } from "./spo2";
import { buildTemperatureFlex } from "./temperature";
import type {
  FlexTemplateContext,
  FlexTemplateInput,
  LineFlexMessage,
  SupabaseFlexTemplate,
  SupabaseMessageContext,
} from "./types";

export {
  FLEX_TEMPLATE_BY_SUPABASE_CONTEXT,
  SUPABASE_MESSAGE_CONTEXTS,
  detectLineFlexTemplateContext,
  detectSupabaseMessageContexts,
  getFlexContextForSupabaseTemplate,
  getFlexTemplateForSupabaseContext,
} from "./context";
export type {
  FlexTemplateContext,
  FlexTemplateInput,
  LineFlexMessage,
  SupabaseFlexTemplate,
  SupabaseMessageContext,
};

export function detectFlexTemplateContext(input: FlexTemplateInput): FlexTemplateContext {
  return detectLineFlexTemplateContext({
    text: input.text,
    hasTimedVitals: input.timedSamples.length > 0,
  });
}

export function buildContextFlexMessage(input: FlexTemplateInput): LineFlexMessage {
  const context = detectFlexTemplateContext(input);

  switch (context) {
    case "bloodPressure":
      return buildBloodPressureFlex(input);
    case "heartRate":
      return buildHeartRateFlex(input);
    case "temperature":
      return buildTemperatureFlex(input);
    case "spo2":
      return buildSpo2Flex(input);
    case "meal":
      return buildMealFlex(input);
    case "medication":
      return buildMedicationFlex(input);
    case "billing":
      return buildBillingFlex(input);
    case "healthReport":
      return buildHealthReportSummaryFlex(input);
    case "simpleText":
    default:
      return buildSimpleTextFlex(input);
  }
}
