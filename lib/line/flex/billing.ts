import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildBillingFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "บันทึกค่าใช้จ่ายเรียบร้อย",
    contents: baseBubble("บันทึกค่าใช้จ่าย", input, [
      textBlock("รับข้อมูลค่าใช้จ่ายหรือการชำระเงินแล้ว เจ้าหน้าที่สามารถตรวจสอบต่อในระบบได้", {
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
