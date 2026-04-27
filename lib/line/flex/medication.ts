import type { FlexTemplateInput, LineFlexMessage } from "./types";

function getMedicationReceiptText(text: string) {
  if (/ก่อนนอน|bedtime|before bed/i.test(text)) {
    return "ได้รับยาก่อนนอนแล้ว";
  }

  if (/หลังอาหาร/i.test(text)) {
    return "ได้รับยาหลังอาหารแล้ว";
  }

  if (/ก่อนอาหาร/i.test(text)) {
    return "ได้รับยาก่อนอาหารแล้ว";
  }

  return "ได้รับข้อมูลการรับประทานยาแล้ว";
}

function getMedicationTimeLabel(input: FlexTemplateInput) {
  const timeMatch = input.text.match(/(?:^|\D)(\d{1,2})[:.](\d{2})(?:\D|$)/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  return input.report.reporterTimeLabel || "--:--";
}

export function buildMedicationFlex(input: FlexTemplateInput): LineFlexMessage {
  const receiptText = getMedicationReceiptText(input.text);
  const timeLabel = getMedicationTimeLabel(input);
  const bodyContents = [
    {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "แจ้งเรื่องการกินยา",
          weight: "bold",
          size: "lg",
          color: "#0D47A1",
        },
        {
          type: "text",
          text: `เวลา [${timeLabel}] ${receiptText}`,
          wrap: true,
          size: "sm",
          color: "#475569",
        },
        {
          type: "separator",
        },
      ],
    },
    ...(input.imageUrl
      ? [
          {
            type: "image",
            url: input.imageUrl,
            size: "full",
            aspectMode: "cover",
          },
        ]
      : []),
  ];

  return {
    type: "flex",
    altText: receiptText,
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "none",
        contents: bodyContents,
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
    },
  };
}
