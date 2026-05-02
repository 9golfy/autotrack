import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

export const gemini = new GoogleGenAI({
  apiKey,
});
