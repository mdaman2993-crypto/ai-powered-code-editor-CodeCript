const { GoogleGenerativeAI } = require("@google/generative-ai");

let cachedModelName_global = null;

// Dev fallback flag: allow local stub when not in production or when explicitly enabled
const ALLOW_DEV_FALLBACK = process.env.ALLOW_DEV_AI_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';

async function resolveModelNameForKey(apiKey) {
  if (cachedModelName_global) return cachedModelName_global;
  const genAI = new GoogleGenerativeAI(apiKey);
  const candidates = [
    process.env.GENERATIVE_MODEL,
    process.env.GEMINI_MODEL,
    process.env.NEXT_PUBLIC_GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.1",
    "gemini-1.5-flash",
    "gemini-1.5",
    "text-bison-001",
  ].filter(Boolean);

  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const res = await model.generateContent("Hello");
      if (res && res.response) {
        cachedModelName_global = name;
        return cachedModelName_global;
      }
    } catch (e) {
      console.warn(`Model probe failed for ${name}: ${e?.message || e}`);
      continue;
    }
  }

  if (ALLOW_DEV_FALLBACK) {
    console.warn('No remote model available — falling back to local dev stub model');
    cachedModelName_global = 'dev-fallback';
    return cachedModelName_global;
  }

  throw new Error("No supported Generative model found for this API key");
}

function createDevFallbackModel() {
  // Return an object that mimics the SDK model's generateContent API
  return {
    async generateContent(prompt) {
      // Simple heuristics to return useful fallback responses for common prompts
      try {
        // If asking to fix code, try to extract the code block and return it unchanged
        const fixMatch = /Fix the syntax errors in the following code:\s*\n([\s\S]*)/i.exec(prompt);
        if (fixMatch && fixMatch[1]) {
          const extracted = fixMatch[1].trim();
          // return the extracted code as 'fixed' so the UI can display something useful
          return { response: { text: () => extracted } };
        }

        // If it's a chat prompt that contains 'User query:' echo the query back
        const chatMatch = /User query:\s*(.*)$/ims.exec(prompt);
        if (chatMatch && chatMatch[1]) {
          const reply = `Dev fallback: I'm offline, echoing your query: ${chatMatch[1].trim()}`;
          return { response: { text: () => reply } };
        }

        // Generic fallback
        return { response: { text: () => 'Dev fallback: Generative model unavailable. This is a canned response for local development.' } };
      } catch (e) {
        return { response: { text: () => 'Dev fallback: an error occurred while preparing a fallback response.' } };
      }
    }
  };
}

function getGenerativeModelForKey(apiKey, modelName) {
  if (modelName === 'dev-fallback') {
    return createDevFallbackModel();
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

module.exports = { resolveModelNameForKey, getGenerativeModelForKey };
