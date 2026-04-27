import { baseBubble, textBlock } from "./shared";
import type { FlexTemplateInput, LineFlexMessage } from "./types";

export function buildMealFlex(input: FlexTemplateInput): LineFlexMessage {
  return {
    type: "flex",
    altText: "บันทึกการได้รับอาหาร",
    contents: baseBubble("บันทึกการได้รับอาหาร", input, [
      textBlock(`รับข้อมูลการได้รับประทานอาหารจาก ${input.groupName ?? "ศูนย์ดูแลผู้สูงอายุ"}`, {
        size: "sm",
        color: "#475569",
      }),
      textBlock(input.text.slice(0, 120), {
        margin: "md",
        size: "xl",
        weight: "bold",
        color: "#64748B",
      }),
      ...(input.imageUrl
        ? [
            {
              type: "image",
              url: input.imageUrl,
              size: "full",
              aspectMode: "cover",
              margin: "md",
            },
          ]
        : []),
    ]),
  };
}
