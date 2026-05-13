const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || "",
};

console.log("[Config] API URL:", config.apiUrl);

export default config;
