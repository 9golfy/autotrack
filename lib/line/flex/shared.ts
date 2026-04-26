import type { FlexBox, FlexTemplateInput } from "./types";

export const statusStyles = {
  green: { backgroundColor: "#E8F9EE", textColor: "#00A86B" },
  orange: { backgroundColor: "#FFF5DF", textColor: "#D97706" },
  red: { backgroundColor: "#FDECEC", textColor: "#DC2626" },
} as const;

export function getStatusStyle(tone: FlexTemplateInput["report"]["statusTone"]) {
  return statusStyles[tone];
}

export function textBlock(text: string, options: FlexBox = {}): FlexBox {
  return {
    type: "text",
    text,
    wrap: true,
    ...options,
  };
}

export function metricRow(label: string, value: string): FlexBox {
  return {
    type: "box",
    layout: "horizontal",
    justifyContent: "space-between",
    contents: [
      textBlock(label, { size: "sm", color: "#64748B", flex: 2 }),
      textBlock(value, { size: "sm", weight: "bold", color: "#111827", flex: 3, align: "end" }),
    ],
  };
}

export function statusBadge(input: FlexTemplateInput): FlexBox {
  const style = getStatusStyle(input.report.statusTone);

  return {
    type: "box",
    layout: "baseline",
    paddingAll: "6px",
    cornerRadius: "999px",
    backgroundColor: style.backgroundColor,
    contents: [
      textBlock(input.report.statusLabel, {
        size: "xs",
        weight: "bold",
        color: style.textColor,
      }),
    ],
  };
}

export function baseBubble(title: string, input: FlexTemplateInput, bodyContents: FlexBox[]): Record<string, unknown> {
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          justifyContent: "space-between",
          alignItems: "center",
          contents: [
            textBlock(title, {
              weight: "bold",
              size: "lg",
              color: "#0D47A1",
              flex: 4,
            }),
            statusBadge(input),
          ],
        },
        ...bodyContents,
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#1976D2",
          action: {
            type: "uri",
            label: "ดูรายงาน",
            uri: input.reportUrl,
          },
        },
      ],
    },
  };
}

export function vitalsSummaryBox(input: FlexTemplateInput): FlexBox {
  const { vitals } = input.report;

  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    margin: "md",
    paddingAll: "14px",
    cornerRadius: "20px",
    backgroundColor: "#F8FBFF",
    contents: [
      metricRow("ความดัน", `${vitals.bloodPressure.value} ${vitals.bloodPressure.unit}`),
      metricRow("ชีพจร", `${vitals.heartRate.value} ${vitals.heartRate.unit}`),
      metricRow("อุณหภูมิ", `${vitals.temperature.value} ${vitals.temperature.unit}`),
      metricRow("ออกซิเจน", `${vitals.spo2.value} ${vitals.spo2.unit}`),
    ],
  };
}

export function latestSample(input: FlexTemplateInput) {
  return input.timedSamples[0] ?? null;
}
