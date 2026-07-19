import { NextResponse } from "next/server";
const { resolveModelNameForKey, getGenerativeModelForKey } = require("@/lib/genai");

// Reuse model detection helper from other routes by defining similar logic here
let cachedModelName_errors = null;
async function resolveModelNameForErrors(apiKey) {
    if (cachedModelName_errors) return cachedModelName_errors;
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
                cachedModelName_errors = name;
                return cachedModelName_errors;
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
        const { code } = await request.json();
        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        // Try to fix code with AI
        let fixedCode = await fixCodeWithAI(code);
        if (fixedCode) {
            return NextResponse.json({ fixedCode, aiFixed: true }, { status: 200 });
        }

        return NextResponse.json({ error: "Failed to fix code" }, { status: 422 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}

// 🔹 AI-Based Auto-Fix for Code
async function fixCodeWithAI(code) {
    try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            let modelName;
            try {
                modelName = await resolveModelNameForKey(apiKey);
            } catch (e) {
                console.error('Model resolution failed for get-errors:', e?.message || e);
                return NextResponse.json({ error: 'No supported model available for this API key', details: e?.message || String(e) }, { status: 502 });
            }
            const model = getGenerativeModelForKey(apiKey, modelName);

        // Create a prompt to fix syntax errors without needing language specification
        const prompt = `Fix the syntax errors in the following code:\n\n${code}\n\nReturn only the corrected code without any comments or formatting like markdown.also if there are any existing comments , dont remove it `;

        const result = await model.generateContent(prompt);
        const fixedCode = result.response.text().replace(/```[a-z]*\n?/gi, "").trim(); // Remove markdown formatting

        return fixedCode;
    } catch (error) {
        console.error("AI Fix Error:", error);
        return null;
    }
}
