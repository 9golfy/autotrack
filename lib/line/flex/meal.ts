import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildMealFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "บันทึกมื้ออาหารเรียบร้อย",
    contents: baseBubble("บันทึกมื้ออาหาร", input, [
      textBlock("รับข้อมูลการรับประทานอาหารจาก LINE แล้ว ข้อมูลนี้จะช่วยให้ครอบครัวติดตามการดูแลรายวันได้ชัดเจนขึ้น", {
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
