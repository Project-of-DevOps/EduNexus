
import axios from 'axios';
import { Mark, StudySession } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const generateStudySchedule = async (marks: Mark[], availableSlots: string[]): Promise<StudySession[]> => {
  try {
    // Get the access token from cookies? 
    // Actually, since we use httpOnly cookies, axios will send them automatically if we set withCredentials: true.
    // However, the frontend might not be configured to send credentials by default for all requests yet.
    // We should ensure axios sends credentials.

    // Assuming global axios config or per-request config.
    const response = await axios.post(`${API_URL}/generate-study-schedule`, {
      marks,
      availableSlots
    }, {
      withCredentials: true // Important for sending cookies
    });

    if (response.data.success) {
      return response.data.schedule;
    } else {
      console.error("Failed to generate schedule:", response.data.error);
      return getMockSchedule();
    }
  } catch (error) {
    console.error("Error calling AI backend:", error);
    return getMockSchedule();
  }
};

const getMockSchedule = (): StudySession[] => {
  return [
    { subject: 'Algorithms', topic: 'Review Big O Notation', startTime: '09:00', endTime: '10:00', reason: 'This is a weak area based on recent marks.' },
    { subject: 'Data Structures', topic: 'Practice with Trees', startTime: '11:00', endTime: '12:00', reason: 'Reinforce concepts for the upcoming exam.' },
    { subject: 'Break', topic: 'Take a break', startTime: '12:00', endTime: '13:00', reason: 'Rest is important.' },
    { subject: 'Database Systems', topic: 'SQL Query Practice', startTime: '13:00', endTime: '14:00', reason: 'Consistent performance, good for review.' }
  ];
};
