// Minimal shared types for the EduNexus app

export enum UserRole {
  Management = 'Management',
  Teacher = 'Teacher',
  Student = 'Student',
  Parent = 'Parent',
  Librarian = 'Librarian',
  Dean = 'Dean'
}

export enum TeacherTitle {
  HOD = 'Head of Department',
  Professor = 'Professor',
  AssociateProfessor = 'Associate Professor',
  AssistantProfessor = 'Assistant Professor',
  Lecturer = 'Lecturer',
  SubjectTeacher = 'Subject Teacher',
  ClassTeacher = 'Class Teacher'
}

export interface LoggedInUser {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  instituteId?: string;
  type?: 'school' | 'institute';
  extra?: Record<string, any>;
  // Role specific optional fields to satisfy AuthContext usage without casting
  childIds?: string[];
  parentId?: string;
  classId?: string;
  department?: string;
  title?: TeacherTitle;
  reportingToId?: string;
  subjects?: string[];
  avatarUrl?: string;
}

export interface Teacher extends LoggedInUser {
  department?: string;
  title?: TeacherTitle;
}

export interface Dean extends Teacher { }

export interface Parent extends LoggedInUser {
  childIds?: string[];
}

export interface Student extends LoggedInUser {
  classId?: string;
  parentId?: string;
}

export interface Class {
  id: string;
  name: string;
  section?: string;
  instituteId?: string;
  departmentId?: string;
  teacherIds?: string[];
  studentIds?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  classId?: string;
  creatorId?: string;
  dueDate?: string;
  priority?: 'Low' | 'Medium' | 'High';
  createdAt?: string;
}

export interface StudentTask {
  id: string;
  taskId: string;
  studentId: string;
  status: 'pending' | 'done' | 'overdue' | 'incomplete' | 'Completed' | 'To Do' | 'In Progress';
  completedDate?: string;
}

export interface Mark {
  id?: string;
  studentId?: string;
  subject?: string;
  score?: number;
  max?: number;
  // Aliases/New properties for dashboard usage
  marks?: number;
  maxMarks?: number;
}

export interface AttendanceRecord {
  id?: string;
  studentId?: string;
  classId?: string;
  date?: string;
  present?: boolean;
  status?: 'present' | 'absent' | 'late' | 'excused';
}

export interface Message {
  id: string;
  fromId?: string;
  toId?: string;
  content: string;
  timestamp: string;
  readBy?: string[];
  senderId?: string;
}

export interface Department { id: string; name: string; instituteId?: string; }

// Library types
export interface Book {
  id: string;
  title: string;
  author?: string;
  createdAt?: string;
  totalCopies?: number;
  availableCopies?: number;
  publisher?: string;
  isbn?: string;
  category?: string;
  tags?: string[];
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  borrowerId: string;
  dueAt?: string;
  returnedAt?: string;
  bookTitle?: string;
  borrowerName?: string;
  borrowedAt?: string;
  status?: 'borrowed' | 'returned' | 'overdue' | 'lost';
}

export interface Reservation {
  id: string;
  bookId: string;
  requesterId: string;
  expiresAt?: string | null;
  bookTitle?: string;
  requesterName?: string;
  reservedAt?: string;
  status?: 'active' | 'fulfilled' | 'cancelled' | 'notified';
}

export interface BookRequest {
  id: string;
  title?: string;
  bookTitle?: string;
  author?: string;
  requesterId?: string;
  requesterName?: string;
  createdAt?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'fulfilled';
}

export interface AuditLog { id: string; action: string; actorId?: string; target?: string; timestamp?: string; note?: string; }
export interface DamageReport { id: string; bookId: string; reporterId?: string; note?: string; status?: string; }

export interface TeacherExtended extends Teacher {
  subjects?: string[];
  orgType?: 'school' | 'institute';
  instituteId?: string;
}

export interface StudySession { id?: string; topic?: string; durationMin?: number; notes?: string }

export interface TeachingAssignment { subject: string; classId: string; }

export default {};
