import { baseBubble, metricRow, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildTemperatureFlex(input: FlexTemplateInput): LineFlexMessage {
  const { temperature } = input.report.vitals;

  return {
    type: "flex",
    altText: `เธเธฑเธเธ—เธถเธเธญเธธเธ“เธซเธ เธนเธกเธด ${temperature.value} ${temperature.unit}`,
    contents: baseBubble("เธเธฑเธเธ—เธถเธเธญเธธเธ“เธซเธ เธนเธกเธด", input, [
      textBlock("เธเธฑเธเธ—เธถเธเธญเธธเธ“เธซเธ เธนเธกเธดเธฃเนเธฒเธเธเธฒเธขเน€เธฃเธตเธขเธเธฃเนเธญเธข เนเธเนเธเธฃเธฐเธเธญเธเธเธฒเธฃเธ•เธดเธ”เธ•เธฒเธกเธญเธฒเธเธฒเธฃเธฃเธฒเธขเธงเธฑเธ", {
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
        contents: [metricRow("เธญเธธเธ“เธซเธ เธนเธกเธด", `${temperature.value} ${temperature.unit}`)],
      },
    ]),
  };
}
