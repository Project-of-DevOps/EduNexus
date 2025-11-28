
export enum UserRole {
  Teacher = 'teacher',
  Student = 'student',
  Parent = 'parent',

  Dean = 'dean',
  Management = 'management'
}

export interface Institute {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  instituteId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // optional profile image URL (Data URL in dev)
  role: UserRole;
}

export interface Student extends User {
  role: UserRole.Student;
  parentId: string;
  classId: string;
}

export interface Teacher extends User {
  role: UserRole.Teacher;
  department: string;
  instituteId: string;
  reportingToId: string; // HOD's ID
}

// More granular titles/ranks for teachers/leadership roles in the institute
export enum TeacherTitle {
  SubjectTeacher = 'Subject Teacher',
  ClassTeacher = 'Class Teacher',
  ClassTeacherAdvisor = 'Class Teacher (Advisor)',
  HOD = 'HOD',
  VicePrincipal = 'Vice Principal',
  Principal = 'Principal',
  Director = 'Director',
  Chairman = 'Chairman',
  Dean = 'Dean',
  Professor = 'Professor',
  AssociateProfessor = 'Associate Professor',
  AssistantProfessor = 'Assistant Professor',
  Lecturer = 'Lecturer',
  SeniorTeacher = 'Senior Teacher'
}

export interface TeachingAssignment {
  subject: string;
  classId: string;
}

export interface TeacherExtended extends Teacher {
  // human readable/functional title inside the institute
  title?: TeacherTitle;
  // subjects this teacher handles (legacy simple list)
  subjects?: string[];
  // detailed teaching assignments (subject + class pairing)
  teachingAssignments?: TeachingAssignment[];
  // class assigned when this teacher is a class-teacher
  classId?: string;
}

export interface Dean extends User { // Represents HOD
  role: UserRole.Dean;
  department: string;
  instituteId: string;
}

export interface Parent extends User {
  role: UserRole.Parent;
  childIds: string[];
}

export interface Management extends User {
  role: UserRole.Management;
  instituteId: string;
}

export type LoggedInUser = Student | Teacher | Parent | Dean | Management;

export interface Class {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
}

export interface Mark {
  studentId: string;
  subject: string;
  exam: string;
  marks: number;
  maxMarks: number;
}

export interface Announcement {
  id: string;
  teacherId: string;
  teacherName: string;
  content: string;
  timestamp: string; // ISO 8601
}

export interface StudySession {
  subject: string;
  topic: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string; // ISO 8601
  targetType: 'class' | 'department';
  targetId: string; // classId or department name
  readBy: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  classId: string;
  creatorId: string; // teacher's id
  dueDate: string; // ISO 8601
  priority: 'High' | 'Medium' | 'Low';
}

export interface StudentTask {
  id: string; // unique student-task assignment id
  taskId: string;
  studentId: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  completedDate?: string; // ISO 8601
}
