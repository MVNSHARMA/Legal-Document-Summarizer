export function getGroqApiKey(): string {
  const envKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!envKey || envKey === "placeholder" || envKey.trim() === "") {
    return "";
  }
  return envKey.trim();
}

export const GROQ_MODEL = "qwen/qwen3.8-27b";

export const API_BASE = (
  import.meta.env.VITE_API_URL || "https://lexanalyze-backend.onrender.com"
).replace(/\/+$/, "");

const config = {
  apiUrl: API_BASE,
  groqApiKey: getGroqApiKey(),
  groqModel: GROQ_MODEL,
};

console.log("[Config] API URL:", config.apiUrl);

export default config;
