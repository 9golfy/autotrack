import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildSpo2Flex(input: FlexTemplateInput): LineFlexMessage {
  const { spo2 } = input.report.vitals;

  return {
    type: "flex",
    altText: `เธเธฑเธเธ—เธถเธเธเนเธฒเธญเธญเธเธเธดเน€เธเธ ${spo2.value} ${spo2.unit}`,
    contents: baseBubble("เธเธฑเธเธ—เธถเธเธเนเธฒเธญเธญเธเธเธดเน€เธเธ", input, [
      textBlock("เธเธฑเธเธ—เธถเธเธเนเธฒเธญเธญเธเธเธดเน€เธเธเนเธเน€เธฅเธทเธญเธ”เน€เธฃเธตเธขเธเธฃเนเธญเธข เธเนเธญเธกเธนเธฅเธเธฐเธ–เธนเธเธฃเธงเธกเนเธเธฃเธฒเธขเธเธฒเธเธชเธธเธเธ เธฒเธ", {
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
