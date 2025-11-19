
import { GoogleGenAI, Type } from "@google/genai";
import { Mark, StudySession } from '../types';

const API_KEY = process.env.API_KEY;

// Initialize ai client as null and only create an instance if API_KEY is available.
let ai: GoogleGenAI | null = null;

if (!API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  console.warn("Gemini API key not found. AI features will be disabled.");
} else {
  // Only instantiate the client if the API key is available to prevent crashes.
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const generateStudySchedule = async (marks: Mark[], availableSlots: string[]): Promise<StudySession[]> => {
  // Use the existence of the 'ai' client as the condition for using the API.
  if (!ai) {
    // Return a mock schedule if the client is not initialized
    console.log("Using mock schedule data.");
    return [
      { subject: 'Algorithms', topic: 'Review Big O Notation', startTime: '09:00', endTime: '10:00', reason: 'This is a weak area based on recent marks.' },
      { subject: 'Data Structures', topic: 'Practice with Trees', startTime: '11:00', endTime: '12:00', reason: 'Reinforce concepts for the upcoming exam.' },
      { subject: 'Break', topic: 'Take a break', startTime: '12:00', endTime: '13:00', reason: 'Rest is important.' },
      { subject: 'Database Systems', topic: 'SQL Query Practice', startTime: '13:00', endTime: '14:00', reason: 'Consistent performance, good for review.' }
    ];
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["subject", "topic", "startTime", "endTime", "reason"]
          }
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as StudySession[];

  } catch (error) {
    console.error("Error generating study schedule with Gemini API:", error);
    // Fallback to mock data in case of an API error
    return [
      { subject: 'Error', topic: 'Could not generate schedule.', startTime: 'N/A', endTime: 'N/A', reason: 'An error occurred while contacting the AI service.' }
    ];
  }
};
