/**
 * translator.ts — Groq-powered translation utility for Indian languages.
 * Translates legal text while preserving names, case numbers, and legal terms.
 */

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

  const apiKey = import.meta.env.VITE_GROQ_API_KEY ?? "";
  if (!apiKey) return text;

  try {
    const response = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      "llama-3.1-8b-instant",
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

    if (!response.ok) return text;

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content?.trim() ?? text;
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
