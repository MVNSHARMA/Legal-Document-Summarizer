/**
 * translator.ts — Groq-powered translation utility for Indian languages.
 * Translates legal text while preserving names, case numbers, and legal terms.
 */

import { getGroqApiKey, GROQ_MODEL, API_BASE } from "../config";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

// ─── Single field translation ─────────────────────────────────────────────────
export async function translateText(
  text: string,
  targetLanguage: string,
  targetLanguageName: string,
): Promise<string> {
  // Skip if already English or text is a default placeholder
  if (targetLanguage === "en") return text;
  if (!text || text === "Not available" || text === "Not identified") return text;

  const apiKey = getGroqApiKey();

  try {
    // 1. Try direct Groq if key is available
    if (apiKey) {
      try {
        const response = await fetch(GROQ_API, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model:      GROQ_MODEL,
            max_tokens: 1000,
            messages: [
              {
                role:    "user",
                content:
                  `Translate the following legal text to ${targetLanguageName}. ` +
                  `Keep legal terms accurate. Keep names of people, courts, and case numbers in their original form. ` +
                  `Return ONLY the translation, no explanation:\n\n${text}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json() as {
            choices: Array<{ message: { content: string } }>;
          };
          const content = data.choices[0]?.message?.content?.trim();
          if (content) return content;
        }
      } catch (clientErr) {
        console.warn("[translator] Direct Groq translation failed, trying backend:", clientErr);
      }
    }

    // 2. Fall back to secure backend proxy (Render)
    const backendRes = await fetch(`${API_BASE}/api/ai/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        target_language_name: targetLanguageName,
      }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json() as { translated_text: string };
      if (data.translated_text) return data.translated_text.trim();
    }

    return text;
  } catch {
    return text; // Return original if translation fails
  }
}

// ─── Translated details shape ─────────────────────────────────────────────────
export interface TranslatableDetails {
  whatHappened:    string;
  crimeOrIssue:    string;
  judgment:        string;
  penaltyOrRelief: string;
}

// ─── Batch translation with progress callback ─────────────────────────────────
export async function translateCaseDetails(
  details: TranslatableDetails,
  targetLanguage: string,
  targetLanguageName: string,
  onProgress?: (field: string) => void,
): Promise<TranslatableDetails> {
  if (targetLanguage === "en") return details;

  const translated = { ...details };

  onProgress?.("What Happened");
  translated.whatHappened = await translateText(
    details.whatHappened, targetLanguage, targetLanguageName,
  );

  onProgress?.("Crime / Issue");
  translated.crimeOrIssue = await translateText(
    details.crimeOrIssue, targetLanguage, targetLanguageName,
  );

  onProgress?.("Judgment");
  translated.judgment = await translateText(
    details.judgment, targetLanguage, targetLanguageName,
  );

  onProgress?.("Penalty / Relief");
  translated.penaltyOrRelief = await translateText(
    details.penaltyOrRelief, targetLanguage, targetLanguageName,
  );

  return translated;
}
