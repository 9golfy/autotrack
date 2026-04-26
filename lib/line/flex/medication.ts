import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildMedicationFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "บันทึกการรับประทานยาเรียบร้อย",
    contents: baseBubble("บันทึกการรับประทานยา", input, [
      textBlock("รับข้อมูลการรับประทานยาแล้ว ระบบจะนำไปแสดงในไทม์ไลน์การดูแลและรายงานสุขภาพ", {
        size: "sm",
        color: "#475569",
      }),
      textBlock(input.text.slice(0, 120), {
        margin: "md",
        size: "xs",
        color: "#64748B",
      }),
    ]),
  };
}
