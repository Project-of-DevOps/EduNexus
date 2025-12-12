import { TeacherTitle } from './types';

export const ATTENDANCE_THRESHOLD = 75; // Percentage

export const TEACHER_TITLES = [
    { id: TeacherTitle.HOD, name: 'Head of Department' },
    { id: TeacherTitle.Professor, name: 'Professor' },
    { id: TeacherTitle.AssociateProfessor, name: 'Associate Professor' },
    { id: TeacherTitle.AssistantProfessor, name: 'Assistant Professor' },
    { id: TeacherTitle.Lecturer, name: 'Lecturer' },
    { id: TeacherTitle.SubjectTeacher, name: 'Subject Teacher' },
    { id: TeacherTitle.ClassTeacher, name: 'Class Teacher' }
];

export const TEACHER_TITLE_RANK: Record<string, number> = {
    [TeacherTitle.HOD]: 10,
    [TeacherTitle.Professor]: 8,
    [TeacherTitle.AssociateProfessor]: 6,
    [TeacherTitle.AssistantProfessor]: 4,
    [TeacherTitle.Lecturer]: 2,
    [TeacherTitle.SubjectTeacher]: 1,
    [TeacherTitle.ClassTeacher]: 1
};
