
import { GoogleGenAI, Type } from "@google/genai";
import { NarratorComment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getNarratorComment = async (action: string, setup: string): Promise<NarratorComment> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The player just did this: "${action}" in the environment: "${setup}". Give a short, witty, one-sentence commentary as a sadistic AI physics scientist.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            mood: { 
              type: Type.STRING,
              enum: ['snarky', 'impressed', 'concerned', 'evil']
            }
          },
          required: ["text", "mood"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"text": "Ouch. That looked expensive.", "mood": "snarky"}');
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Physics is hard, isn't it?", mood: "snarky" };
  }
};
