import { gemini } from "@/lib/gemini";

export type CareImageCategory =
  | "meal"
  | "medication"
  | "vital_sign"
  | "activity"
  | "sleep"
  | "expense"
  | "unknown";

export type CareImageRiskLevel = "normal" | "watch" | "urgent" | "unknown";

export type CareImageAnalysis = {
  category: CareImageCategory;
  confidence: number;
  thaiSummary: string;
  shouldNotifyFamily: boolean;
  riskLevel: CareImageRiskLevel;
};

const GEMINI_MIN_REQUEST_INTERVAL_MS = 4_100;
let geminiRequestQueue: Promise<void> = Promise.resolve();
let lastGeminiRequestAt = 0;

const CARE_IMAGE_PROMPT = `
You are an elderly care assistant system in Thailand.

Analyze this image or video and return JSON only.

Classify the image into one category:
- meal
- medication
- vital_sign
- activity
- sleep
- expense
- unknown

Return this JSON format:
{
  "category": "",
  "confidence": 0,
  "thaiSummary": "",
  "shouldNotifyFamily": true,
  "riskLevel": "normal | watch | urgent | unknown"
}

Important:
- Do not diagnose.
- If unsure, use category "unknown".
- If it looks like breakfast/lunch/dinner served, prepared, being held, or being eaten, use "meal".
- If it shows pills/medicine being given or prepared, use "medication".
`.trim();

function parseGeminiJson(text: string): CareImageAnalysis {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  const parsed = JSON.parse(jsonText) as Partial<CareImageAnalysis>;

  return {
    category: parsed.category ?? "unknown",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    thaiSummary: typeof parsed.thaiSummary === "string" ? parsed.thaiSummary : "",
    shouldNotifyFamily: Boolean(parsed.shouldNotifyFamily),
    riskLevel: parsed.riskLevel ?? "unknown",
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function enqueueGeminiRequest<T>(task: () => Promise<T>) {
  const nextRun = geminiRequestQueue.then(async () => {
    const elapsed = Date.now() - lastGeminiRequestAt;

    if (elapsed < GEMINI_MIN_REQUEST_INTERVAL_MS) {
      await wait(GEMINI_MIN_REQUEST_INTERVAL_MS - elapsed);
    }

    lastGeminiRequestAt = Date.now();
    return task();
  });

  geminiRequestQueue = nextRun.then(
    () => undefined,
    () => undefined,
  );

  return nextRun;
}

export async function analyzeCareImage(imageUrl: string): Promise<CareImageAnalysis> {
  const parsedUrl = new URL(imageUrl);

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("imageUrl must be http or https");
  }

  const imageRes = await fetch(parsedUrl, { cache: "no-store" });

  if (!imageRes.ok) {
    throw new Error(`Image fetch failed: ${imageRes.status}`);
  }

  const contentType = imageRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";

  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    throw new Error("imageUrl must point to an image or video");
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");

  const result = await enqueueGeminiRequest(() =>
    gemini.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: CARE_IMAGE_PROMPT,
            },
            {
              inlineData: {
                mimeType: contentType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    }),
  );

  return parseGeminiJson(result.text ?? "{}");
}
