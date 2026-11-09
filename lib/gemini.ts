import {GoogleGenAI} from "@google/genai";

const ai = new GoogleGenAI({apiKey : process.env.GEMINI_API_KEY})

export async function generateJSON (opts : {
    prompt : string;
    schema : object;
    system? :  string;
    smart? : boolean;
}) 
{
    const model = opts.smart
    ? process.env.GEMINI_MODEL_SMART!
    : process.env.GEMINI_MODEL_FAST!;

    const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config:
        {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseSchema: opts.schema,

        },
    });
    return JSON.parse(res.text ?? "");
}