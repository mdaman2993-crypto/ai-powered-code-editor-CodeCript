import { NextResponse } from "next/server";
const { resolveModelNameForKey, getGenerativeModelForKey } = require("@/lib/genai");

// Cache the working model name to avoid repeated probes
let cachedModelName = null;

async function resolveModelName(apiKey) {
    if (cachedModelName) return cachedModelName;
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidates = [
        process.env.GENERATIVE_MODEL,
        process.env.GEMINI_MODEL,
        "gemini-1.5-flash",
        "gemini-1.5",
        "gemini-1.0",
        "models/text-bison-001",
        "text-bison-001",
    ].filter(Boolean);

    for (const name of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: name });
            // quick dry-run to see if supported
            const res = await model.generateContent("Hello");
            if (res && res.response) {
                cachedModelName = name;
                return cachedModelName;
            }
        } catch (e) {
            // try next
            console.warn(`Model probe failed for ${name}: ${e?.message || e}`);
            continue;
        }
    }
    throw new Error("No supported Generative model found for this API key");
}

export async function POST(request) {
    try {
        const { message } = await request.json();
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API key missing for getChatResponse route");
            return NextResponse.json({ error: "Gemini API key missing on server" }, { status: 500 });
        }

                    let modelName;
                    try {
                        modelName = await resolveModelNameForKey(apiKey);
                    } catch (e) {
                        console.error('Model resolution failed for getChatResponse:', e?.message || e);
                        return NextResponse.json({ error: 'No supported model available for this API key', details: e?.message || String(e) }, { status: 502 });
                    }
                    const model = getGenerativeModelForKey(apiKey, modelName);

            const safePrompt = `You are a helpful AI code assistant. Answer concisely and provide code examples when relevant. User query: ${String(
                message
            )}`;

            const result = await model.generateContent(safePrompt);
            const aiResponse = result.response?.text?.().trim?.() || String(result.response || "");

        console.log("AI response length:", aiResponse.length);

        return NextResponse.json({ aiResponse }, { status: 200 });
    } catch (error) {
        console.error("Gemini API Error (getChatResponse):", error?.response?.data || error?.message || error);
        return NextResponse.json({ error: "Failed to generate response", details: error?.response?.data || error?.message }, { status: 500 });
    }
}