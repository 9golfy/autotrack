import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildSimpleTextFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "บันทึกข้อความเรียบร้อย",
    contents: baseBubble("บันทึกข้อความ", input, [
      textBlock(`ระบบบันทึกข้อความจาก ${input.groupName ?? "LINE Care Group"} แล้ว`, {
        size: "sm",
        color: "#475569",
      }),
      textBlock(input.text.slice(0, 140), {
        margin: "md",
        size: "xs",
        color: "#64748B",
      }),
    ]),
  };
}
