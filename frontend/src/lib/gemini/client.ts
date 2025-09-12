import { GoogleGenerativeAI } from "@google/generative-ai";
import { FORM_GENERATION_PROMPT } from "./prompt-templates";
import { GeneratedForm } from "@/types/gemini";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export async function generateForm(
  description: string,
): Promise<GeneratedForm> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = FORM_GENERATION_PROMPT + description;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Raw AI response:", text);

    // Clean the response text - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    console.log("Cleaned text:", cleanedText);

    let formData;
    try {
      formData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Text that failed to parse:", cleanedText);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate the structure
    if (!formData.title || !Array.isArray(formData.questions)) {
      console.error("Invalid structure:", formData);
      throw new Error("Invalid response format from AI");
    }

    return formData as GeneratedForm;
  } catch (error) {
    console.error("Error generating form:", error);
    throw new Error("Failed to generate form with AI");
  }
}