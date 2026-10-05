import { GoogleGenAI } from "@google/genai";
async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: "PLACEHOLDER_API_KEY" });
    await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "Hi" });
  } catch (e) {
    console.error(e);
  }
}
run();
