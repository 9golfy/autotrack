import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildHeartRateFlex(input: FlexTemplateInput): LineFlexMessage {
  const { heartRate } = input.report.vitals;

  return {
    type: "flex",
    altText: `เธเธฑเธเธ—เธถเธเธเธตเธเธเธฃ ${heartRate.value} ${heartRate.unit}`,
    contents: baseBubble("เธเธฑเธเธ—เธถเธเธเนเธฒเธเธตเธเธเธฃ", input, [
      textBlock("เธเธฑเธเธ—เธถเธเธญเธฑเธ•เธฃเธฒเธเธฒเธฃเน€เธ•เนเธเธเธญเธเธซเธฑเธงเนเธเน€เธฃเธตเธขเธเธฃเนเธญเธข เนเธเนเธ•เธดเธ”เธ•เธฒเธกเนเธเธงเนเธเนเธกเธฃเธฒเธขเธงเธฑเธเนเธ Mini App", {
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
        contents: [metricRow("เธเธตเธเธเธฃ", `${heartRate.value} ${heartRate.unit}`)],
      },
    ]),
  };
}
