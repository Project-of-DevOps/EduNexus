
const { GoogleGenAI, SchemaType } = require("@google/genai");
const logger = require('../utils/logger');

// Allow selecting AI provider via environment variables.
// - AI_PROVIDER: 'gemini' (default) or 'anthropic'
// - AI_MODEL: model name to use for the chosen provider (optional)
// - For Gemini: GEMINI_API_KEY
// - For Anthropic/Claude: ANTHROPIC_API_KEY
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let ai = null;
if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    logger.info('AI provider: Gemini (configured)');
} else if (AI_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
    // Minimal Anthropic client representation. We will use fetch below when needed.
    ai = { provider: 'anthropic', apiKey: ANTHROPIC_API_KEY };
    logger.info('AI provider: Anthropic (configured)');
} else {
    logger.warn('No AI provider configured. AI features will use mock data.');
}

const generateStudySchedule = async (marks, availableSlots) => {
    if (!ai) {
        logger.info("Generating mock study schedule (No API Key).");
        return getMockSchedule();
    }

    const marksSummary = marks.map(m => `- ${m.subject}: ${m.marks}/${m.maxMarks}`).join('\n');
    const availableSlotsSummary = availableSlots.join(', ');

    const prompt = `
    You are an expert academic advisor. Your task is to create a personalized, one-day study schedule for a student based on their recent performance and available time slots.
    Prioritize subjects where the student has lower marks (weak areas). Use principles of spaced repetition and active recall.
    
    Student's Performance:
    ${marksSummary}

    Available Study Slots for Today:
    ${availableSlotsSummary}

    Generate a schedule with specific topics to study for each session. For each session, provide a brief reason for its inclusion and priority. Keep sessions to about 50-60 minutes and include short breaks.
    
    Output the schedule in the specified JSON format. Do not include any other text or markdown formatting.
  `;

    try {
        // Anthropic (Claude) path: call REST API if configured
        if (ai && ai.provider === 'anthropic') {
            // Use global fetch (Node 18+). If unavailable, this will throw and be caught.
            const anthropicModel = process.env.AI_MODEL || 'claude-haiku-4.5';
            const res = await fetch('https://api.anthropic.com/v1/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ai.apiKey
                },
                body: JSON.stringify({
                    model: anthropicModel,
                    prompt,
                    max_tokens_to_sample: 800,
                    temperature: 0.2
                })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Anthropic API error: ${res.status} ${txt}`);
            }

            const data = await res.json();
            // Anthropic returns a `completion` field in many responses
            const jsonText = (data.completion || data.result?.content || '').trim();
            if (!jsonText) throw new Error('Empty completion from Anthropic');
            return JSON.parse(jsonText);
        }

        // Default: Gemini path
        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            subject: { type: SchemaType.STRING },
                            topic: { type: SchemaType.STRING },
                            startTime: { type: SchemaType.STRING },
                            endTime: { type: SchemaType.STRING },
                            reason: { type: SchemaType.STRING }
                        },
                        required: ["subject", "topic", "startTime", "endTime", "reason"]
                    }
                }
            }
        });

        const jsonText = response.text().trim();
        return JSON.parse(jsonText);

    } catch (error) {
        logger.error("Error generating study schedule with AI provider:", error);
        return getMockSchedule();
    }
};

const getMockSchedule = () => {
    return [
        { subject: 'Algorithms', topic: 'Review Big O Notation', startTime: '09:00', endTime: '10:00', reason: 'This is a weak area based on recent marks.' },
        { subject: 'Data Structures', topic: 'Practice with Trees', startTime: '11:00', endTime: '12:00', reason: 'Reinforce concepts for the upcoming exam.' },
        { subject: 'Break', topic: 'Take a break', startTime: '12:00', endTime: '13:00', reason: 'Rest is important.' },
        { subject: 'Database Systems', topic: 'SQL Query Practice', startTime: '13:00', endTime: '14:00', reason: 'Consistent performance, good for review.' }
    ];
};

module.exports = { generateStudySchedule };
