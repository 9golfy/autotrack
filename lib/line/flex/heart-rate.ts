import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildHeartRateFlex(input: FlexTemplateInput): LineFlexMessage {
  const { heartRate } = input.report.vitals;

  return {
    type: "flex",
    altText: `บันทึกชีพจร ${heartRate.value} ${heartRate.unit}`,
    contents: baseBubble("บันทึกค่าชีพจร", input, [
      textBlock("บันทึกอัตราการเต้นของหัวใจเรียบร้อย ใช้ติดตามแนวโน้มรายวันใน Mini App", {
        size: "sm",
        color: "#475569",
      }),
      {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        margin: "md",
        paddingAll: "14px",
        cornerRadius: "20px",
        backgroundColor: "#FFF7FA",
        contents: [metricRow("ชีพจร", `${heartRate.value} ${heartRate.unit}`)],
      },
    ]),
  };
}
