import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildSpo2Flex(input: FlexTemplateInput): LineFlexMessage {
  const { spo2 } = input.report.vitals;

  return {
    type: "flex",
    altText: `บันทึกค่าออกซิเจน ${spo2.value} ${spo2.unit}`,
    contents: baseBubble("บันทึกค่าออกซิเจน", input, [
      textBlock("บันทึกค่าออกซิเจนในเลือดเรียบร้อย ข้อมูลจะถูกรวมในรายงานสุขภาพ", {
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
        backgroundColor: "#F5F3FF",
        contents: [metricRow("SpO2", `${spo2.value} ${spo2.unit}`)],
      },
    ]),
  };
}
