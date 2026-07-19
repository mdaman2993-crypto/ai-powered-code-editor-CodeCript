import { NextResponse } from "next/server";
const { resolveModelNameForKey, getGenerativeModelForKey } = require("@/lib/genai");

let cachedModelName_docs = null;
async function resolveModelNameForDocs(apiKey) {
    if (cachedModelName_docs) return cachedModelName_docs;
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
            const res = await model.generateContent("Hello");
            if (res && res.response) {
                cachedModelName_docs = name;
                return cachedModelName_docs;
            }
        } catch (e) {
            console.warn(`Model probe failed for ${name}: ${e?.message || e}`);
            continue;
        }
    }
    throw new Error("No supported Generative model found for this API key");
}

export async function POST(request) {
    try {
        const { code, language } = await request.json();
        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API key missing. Set GEMINI_API_KEY in environment.");
            return NextResponse.json({ error: "Gemini API key missing on server" }, { status: 500 });
        }

                        let modelName;
                        try {
                            modelName = await resolveModelNameForKey(apiKey);
                        } catch (e) {
                            console.error('Model resolution failed for generate-documentation:', e?.message || e);
                            return NextResponse.json({ error: 'No supported model available for this API key', details: e?.message || String(e) }, { status: 502 });
                        }
                        const model = getGenerativeModelForKey(apiKey, modelName);

        const prompt = `Generate documentation for the following code. Return ONLY inline comments (no code blocks, no markdown). Use the appropriate comment style for the language and make the documentation detailed and descriptive. Append these comments to the end of the file. Code:\n${code}`;

        const result = await model.generateContent(prompt);
        const documentation = result.response?.text?.().trim?.() || String(result.response || "");

        return NextResponse.json({ documentation }, { status: 200 });
    } catch (error) {
        console.error("Gemini API Error:", error?.response?.data || error?.message || error);
        return NextResponse.json(
            { error: "Failed to generate documentation", details: error?.response?.data || error?.message },
            { status: 500 }
        );
    }
}
