import {
  evaluateBloodPressure,
  evaluateHeartRate,
  evaluateRespiratoryRate,
  evaluateSpo2,
  evaluateTemperature,
} from "@/lib/health-thresholds";
import type { TimedVitalsSample } from "@/lib/health-report";
import { statusStyles } from "./shared";
import type { FlexBox, FlexTemplateInput, LineFlexMessage } from "./types";

const METRIC_ICONS = {
  bp: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lo_bp.png",
  heart: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lo_heart.png",
  lung: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_lung.png",
  temp: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_term.png",
  spo2: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_spo2.png",
};

function getMetricBadge(label: string, tone: "green" | "orange" | "red"): FlexBox {
  const colors = {
    green: { backgroundColor: "#DCFCE7", textColor: "#15803D" },
    orange: { backgroundColor: "#FB923C", textColor: "#FFFFFF" },
    red: { backgroundColor: "#FDECEC", textColor: "#DC2626" },
  }[tone];

  return {
    type: "box",
    layout: "vertical",
    width: "42px",
    backgroundColor: colors.backgroundColor,
    cornerRadius: "999px",
    paddingTop: "3px",
    paddingBottom: "3px",
    margin: "xs",
    contents: [
      {
        type: "text",
        text: label,
        size: "xxs",
        weight: "bold",
        color: colors.textColor,
        align: "center",
      },
    ],
  };
}

function metricLine(
  icon: string,
  label: string,
  value: string,
  unit: string,
  badgeLabel: string,
  tone: "green" | "orange" | "red",
): FlexBox {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    contents: [
      { type: "image", url: icon, size: "xxs", flex: 0 },
      { type: "text", text: label, size: "xs", color: "#475569", margin: "sm", flex: 3 },
      {
        type: "text",
        text: value,
        size: "sm",
        weight: "bold",
        color: "#0F172A",
        align: "end",
        flex: 3,
      },
      { type: "text", text: unit, size: "xxs", color: "#64748B", margin: "xs", flex: 1 },
      getMetricBadge(badgeLabel, tone),
    ],
  };
}

function buildTimedVitalsFlexBlocks(samples: TimedVitalsSample[]): FlexBox[] {
  const orderedSamples = [...samples].sort((a, b) => a.hour - b.hour);

  return orderedSamples.slice(0, 2).map((sample) => {
    const bpEval = evaluateBloodPressure(sample.systolic, sample.diastolic);
    const hrEval = evaluateHeartRate(sample.heartRate);
    const rrEval = evaluateRespiratoryRate(sample.respiratoryRate);
    const tempEval = evaluateTemperature(sample.temperature);
    const spo2Eval = evaluateSpo2(sample.spo2);

    const isNight = sample.hour >= 20 || sample.hour < 8;
    const timeIcon = isNight
      ? "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_moon.png"
      : "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_aun.png";

    return {
      type: "box",
      layout: "vertical",
      cornerRadius: "16px",
      borderColor: "#E5E7EB",
      borderWidth: "1px",
      paddingAll: "12px",
      spacing: "xs",
      margin: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "image", url: timeIcon, size: "xxs", flex: 0 },
            {
              type: "text",
              text: `[${sample.label} น.]`,
              size: "md",
              weight: "bold",
              color: "#1E3A8A",
              margin: "sm",
            },
          ],
        },
        { type: "separator", color: "#E5E7EB" },
        metricLine(
          METRIC_ICONS.bp,
          "ความดัน",
          `${sample.systolic ?? "--"}/${sample.diastolic ?? "--"}`,
          "mmHg",
          bpEval.label === "ปกติ" ? "ปกติ" : bpEval.label === "เหมาะสม" ? "ดี" : "สูง",
          bpEval.severity === "normal" ? "green" : bpEval.severity === "watch" ? "orange" : "red",
        ),
        metricLine(
          METRIC_ICONS.heart,
          "ชีพจร",
          `${sample.heartRate ?? "--"}`,
          "bpm",
          hrEval.label,
          hrEval.severity === "normal" ? "green" : "orange",
        ),
        metricLine(
          METRIC_ICONS.lung,
          "หายใจ",
          `${sample.respiratoryRate ?? "--"}`,
          "/นาที",
          rrEval.label,
          rrEval.severity === "normal" ? "green" : "orange",
        ),
        metricLine(
          METRIC_ICONS.temp,
          "อุณหภูมิ",
          `${sample.temperature?.toFixed(1) ?? "--"}`,
          "°C",
          tempEval.label,
          tempEval.severity === "normal" ? "green" : tempEval.severity === "watch" ? "orange" : "red",
        ),
        metricLine(
          METRIC_ICONS.spo2,
          "SpO2",
          `${sample.spo2 ?? "--"}`,
          "%",
          spo2Eval.label,
          spo2Eval.severity === "normal" ? "green" : spo2Eval.severity === "watch" ? "orange" : "red",
        ),
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: bpEval.severity === "normal" ? "#ECFDF5" : "#FFF7ED",
          cornerRadius: "10px",
          paddingAll: "8px",
          margin: "sm",
          contents: [
            {
              type: "image",
              url: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_trend.png",
              size: "xxs",
              flex: 0,
            },
            {
              type: "text",
              text: `แนวโน้ม: ${
                bpEval.severity === "normal" ? "อยู่ในเกณฑ์ปกติ" : "ควรติดตามอย่างใกล้ชิด"
              }`,
              size: "xs",
              weight: "bold",
              color: bpEval.severity === "normal" ? "#16A34A" : "#F97316",
              margin: "sm",
              wrap: true,
            },
          ],
        },
      ],
    };
  });
}

export function buildHealthReportFlex(input: FlexTemplateInput): LineFlexMessage {
  const style = statusStyles[input.report.statusTone];

  return {
    type: "flex",
    altText: `รายงานสุขภาพ: ${input.report.statusLabel}`,
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              {
                type: "image",
                url: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_aun.png",
                size: "xxs",
                flex: 0,
              },
              {
                type: "text",
                text: "บันทึกข้อมูลสำเร็จ",
                size: "xl",
                weight: "bold",
                color: "#0F172A",
                margin: "sm",
                flex: 1,
              },
              {
                type: "box",
                layout: "vertical",
                width: "70px",
                backgroundColor: style.backgroundColor,
                cornerRadius: "999px",
                paddingTop: "5px",
                paddingBottom: "5px",
                contents: [
                  {
                    type: "text",
                    text: input.report.statusLabel,
                    size: "xxs",
                    weight: "bold",
                    color: style.textColor,
                    align: "center",
                  },
                ],
              },
            ],
          },
          {
            type: "text",
            text: `ข้อมูลจาก ${input.groupName ?? "ศูนย์ดูแลผู้สูงอายุ"}\nวันนี้มี ${input.timedSamples.length} ช่วงเวลา`,
            size: "sm",
            color: "#64748B",
            wrap: true,
          },
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#EFF6FF",
            cornerRadius: "16px",
            paddingAll: "12px",
            spacing: "sm",
            contents: [
              {
                type: "image",
                url: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/lc_trend.png",
                size: "xxs",
                flex: 0,
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                spacing: "xs",
                contents: [
                  { type: "text", text: "ภาพรวมวันนี้", size: "sm", weight: "bold", color: "#2563EB" },
                  {
                    type: "text",
                    text: input.report.aiSummary,
                    size: "md",
                    weight: "bold",
                    color: "#0F172A",
                    wrap: true,
                    maxLines: 3,
                  },
                ],
              },
              {
                type: "image",
                url: "https://plyczwoijpcnahvsuxxe.supabase.co/storage/v1/object/public/line-media/line-webhook/nurse.png",
                size: "sm",
                flex: 0,
              },
            ],
          },
          ...buildTimedVitalsFlexBlocks(input.timedSamples),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2563EB",
            action: { type: "uri", label: "ดูรายงาน", uri: input.reportUrl },
          },
        ],
      },
    },
  };
}