import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildBillingFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "เธเธฑเธเธ—เธถเธเธเนเธฒเนเธเนเธเนเธฒเธขเน€เธฃเธตเธขเธเธฃเนเธญเธข",
    contents: baseBubble("เธเธฑเธเธ—เธถเธเธเนเธฒเนเธเนเธเนเธฒเธข", input, [
      textBlock("เธฃเธฑเธเธเนเธญเธกเธนเธฅเธเนเธฒเนเธเนเธเนเธฒเธขเธซเธฃเธทเธญเธเธฒเธฃเธเธณเธฃเธฐเน€เธเธดเธเนเธฅเนเธง เน€เธเนเธฒเธซเธเนเธฒเธ—เธตเนเธชเธฒเธกเธฒเธฃเธ–เธ•เธฃเธงเธเธชเธญเธเธ•เนเธญเนเธเธฃเธฐเธเธเนเธ”เน", {
        size: "sm",
        color: "#475569",
      }),
      textBlock(input.text.slice(0, 120), {
        margin: "md",
        size: "xs",
        color: "#64748B",
      }),
    ]),
  };
}
