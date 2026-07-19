import { NextResponse } from "next/server";
const { resolveModelNameForKey, getGenerativeModelForKey } = require("@/lib/genai");

export async function POST(request) {
    try {
        const { code, language } = await request.json();
        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        let modelName;
        try {
            modelName = await resolveModelNameForKey(apiKey);
        } catch (e) {
            console.error('Model resolution failed for auto-complete:', e?.message || e);
            return NextResponse.json({ error: 'No supported model available for this API key', details: e?.message || String(e) }, { status: 502 });
        }
        const model = getGenerativeModelForKey(apiKey, modelName);

        const prompt = `generate clear and concise documentation in the form of comments to be added at the end of the 
        code file for the code: ${code}. use the approapriate comment format for the language of the code.`

        const result = await model.generateContent(prompt);
        let documentation = result.response.text().trim();
        documentation = documentation.replace(/```[\s\S]*?```/g, ""); // Remove triple backticks if any
        documentation = documentation.replace(code, "").trim(); // Remove the code if it appears
        console.log(documentation);
        
        return NextResponse.json({ documentation }, { status: 200 });
    } catch (error) {
        console.error("Gemini API Error:", error.response?.data || error.message);
        return NextResponse.json({ error: "Failed to generate documentation" }, { status: 500 });
    }
}
