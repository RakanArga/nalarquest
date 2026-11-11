import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API || process.env.GEMINI_API_KEY,
});

export type ChatMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

export async function generateJSON(opts: {
  prompt?: string;
  history?: ChatMessage[];
  schema: object;
  system?: string;
  smart?: boolean;
}) {
  const model = opts.smart
    ? process.env.GEMINI_MODEL_SMART!
    : process.env.GEMINI_MODEL_FAST!;

  const res = await ai.models.generateContent({
    model,
    contents: opts.history ?? opts.prompt ?? "",
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    },
  });
  return JSON.parse(res.text ?? "");
}
