import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in the environment variables. AI features will not work.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");

// Expose the configured model
export const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });