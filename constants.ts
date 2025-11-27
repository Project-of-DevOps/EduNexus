
import { UserRole } from './types';

export const ROLES = [
  { id: UserRole.Teacher, name: 'Teacher' },
  { id: UserRole.Student, name: 'Student' },
  { id: UserRole.Parent, name: 'Parent' },
];

export const ATTENDANCE_THRESHOLD = 75;

export const TEACHER_TITLES = [
  { id: 'subject-teacher', name: 'Subject Teacher' },
  { id: 'class-teacher', name: 'Class Teacher' },
  { id: 'hod', name: 'HOD' },
  { id: 'vice-principal', name: 'Vice Principal' },
  { id: 'principal', name: 'Principal' },
  { id: 'director', name: 'Director' },
  { id: 'chairman', name: 'Chairman' },
];

// Higher number => more powerful / higher rank
export const TEACHER_TITLE_RANK: Record<string, number> = {
  'subject-teacher': 1,
  'class-teacher': 2,
  'hod': 3,
  'vice-principal': 4,
  'principal': 5,
  'director': 6,
  'chairman': 7,
};
