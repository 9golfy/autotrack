import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildTemperatureFlex(input: FlexTemplateInput): LineFlexMessage {
  const { temperature } = input.report.vitals;

  return {
    type: "flex",
    altText: `บันทึกอุณหภูมิ ${temperature.value} ${temperature.unit}`,
    contents: baseBubble("บันทึกอุณหภูมิ", input, [
      textBlock("บันทึกอุณหภูมิร่างกายเรียบร้อย ใช้ประกอบการติดตามอาการรายวัน", {
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
        backgroundColor: "#FFF7ED",
        contents: [metricRow("อุณหภูมิ", `${temperature.value} ${temperature.unit}`)],
      },
    ]),
  };
}
