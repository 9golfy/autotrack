import { baseBubble, metricRow, textBlock, vitalsSummaryBox } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildBloodPressureFlex(input: FlexTemplateInput): LineFlexMessage {
  const { bloodPressure } = input.report.vitals;

  return {
    type: "flex",
    altText: `บันทึกความดัน ${bloodPressure.value} ${bloodPressure.unit}`,
    contents: baseBubble("บันทึกค่าความดัน", input, [
      textBlock(`ระบบบันทึกค่าความดันจาก ${input.groupName ?? "LINE Care Group"} แล้ว สามารถติดตามแนวโน้มต่อในรายงานสุขภาพได้`, {
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
        backgroundColor: "#F8FBFF",
        contents: [metricRow("ความดันโลหิต", `${bloodPressure.value} ${bloodPressure.unit}`)],
      },
    ]),
  };
}

export function buildHealthReportSummaryFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: `บันทึกข้อมูลสำเร็จ • ความดัน ${input.report.vitals.bloodPressure.value}`,
    contents: baseBubble("บันทึกข้อมูลสำเร็จ", input, [
      textBlock(input.report.aiSummary, {
        size: "sm",
        color: "#475569",
      }),
      vitalsSummaryBox(input),
    ]),
  };
}
