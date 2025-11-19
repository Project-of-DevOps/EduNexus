
import { Student, Teacher, Parent, Dean, UserRole, Class, AttendanceRecord, Mark, Announcement, Institute, Department, Message, Task, StudentTask } from '../types';

export const mockInstitutes: Institute[] = [
  { id: 'inst1', name: 'Greenwood University' },
  { id: 'inst2', name: 'Oakridge Institute of Technology' },
];

export const mockDepartments: Department[] = [
  { id: 'dept1', name: 'Computer Science', instituteId: 'inst1' },
  { id: 'dept2', name: 'Business Administration', instituteId: 'inst1' },
  { id: 'dept3', name: 'Mechanical Engineering', instituteId: 'inst2' },
];

export const mockUsers: (Student | Teacher | Parent | Dean)[] = [
  // HODs (Deans)
  { id: 'dean1', name: 'Dr. Evelyn Reed', email: 'dean.reed@university.edu', role: UserRole.Dean, department: 'Computer Science', instituteId: 'inst1' },
  { id: 'dean2', name: 'Dr. Samuel Chen', email: 'dean.chen@university.edu', role: UserRole.Dean, department: 'Business Administration', instituteId: 'inst1' },
  { id: 'dean3', name: 'Dr. Maria Garcia', email: 'dean.garcia@tech.edu', role: UserRole.Dean, department: 'Mechanical Engineering', instituteId: 'inst2' },
  
  // Professors (Teachers)
  { id: 'teacher1', name: 'Mr. Alan Grant', email: 'alan.grant@university.edu', role: UserRole.Teacher, department: 'Computer Science', instituteId: 'inst1', reportingToId: 'dean1' },
  { id: 'teacher2', name: 'Ms. Laura Dern', email: 'laura.dern@university.edu', role: UserRole.Teacher, department: 'Computer Science', instituteId: 'inst1', reportingToId: 'dean1' },
  { id: 'teacher3', name: 'Mr. Jeff Goldblum', email: 'jeff.goldblum@tech.edu', role: UserRole.Teacher, department: 'Mechanical Engineering', instituteId: 'inst2', reportingToId: 'dean3' },

  // Students
  { id: 'student1', name: 'John Doe', email: 'john.doe@university.edu', role: UserRole.Student, parentId: 'parent1', classId: 'cs101' },
  { id: 'student2', name: 'Jane Smith', email: 'jane.smith@university.edu', role: UserRole.Student, parentId: 'parent1', classId: 'cs101' },
  { id: 'student3', name: 'Peter Jones', email: 'peter.jones@university.edu', role: UserRole.Student, parentId: 'parent2', classId: 'cs101' },
  
  // Parents
  { id: 'parent1', name: 'David Doe', email: 'john.doe@university.edu', role: UserRole.Parent, childIds: ['student1', 'student2'] },
  { id: 'parent2', name: 'Mary Jones', email: 'peter.jones@university.edu', role: UserRole.Parent, childIds: ['student3'] },
];

export const mockClasses: Class[] = [
  { id: 'cs101', name: 'BCA 5th Sem', teacherIds: ['teacher1', 'dean1'], studentIds: ['student1', 'student2', 'student3'] },
  { id: 'bcom202', name: 'B.Com 3rd Sem', teacherIds: ['dean2'], studentIds: [] },
];

export const mockAttendance: AttendanceRecord[] = [
  { studentId: 'student1', date: '2024-07-20', status: 'present' },
  { studentId: 'student1', date: '2024-07-21', status: 'present' },
  { studentId: 'student1', date: '2024-07-22', status: 'absent' },
  { studentId: 'student1', date: '2024-07-23', status: 'present' },
  { studentId: 'student1', date: '2024-07-24', status: 'present' },
  { studentId: 'student2', date: '2024-07-20', status: 'present' },
  { studentId: 'student2', date: '2024-07-21', status: 'present' },
  { studentId: 'student2', date: '2024-07-22', status: 'present' },
  { studentId: 'student2', date: '2024-07-23', status: 'present' },
  { studentId: 'student2', date: '2024-07-24', status: 'present' },
  { studentId: 'student3', date: '2024-07-20', status: 'present' },
  { studentId: 'student3', date: '2024-07-21', status: 'absent' },
  { studentId: 'student3', date: '2024-07-22', status: 'absent' },
  { studentId: 'student3', date: '2024-07-23', status: 'present' },
  { studentId: 'student3', date: '2024-07-24', status: 'absent' },
];

export const mockMarks: Mark[] = [
  { studentId: 'student1', subject: 'Data Structures', exam: 'Midterm 1', marks: 85, maxMarks: 100 },
  { studentId: 'student1', subject: 'Algorithms', exam: 'Midterm 1', marks: 60, maxMarks: 100 },
  { studentId: 'student1', subject: 'Database Systems', exam: 'Midterm 1', marks: 92, maxMarks: 100 },
  { studentId: 'student2', subject: 'Data Structures', exam: 'Midterm 1', marks: 95, maxMarks: 100 },
  { studentId: 'student2', subject: 'Algorithms', exam: 'Midterm 1', marks: 88, maxMarks: 100 },
  { studentId: 'student2', subject: 'Database Systems', exam: 'Midterm 1', marks: 90, maxMarks: 100 },
  { studentId: 'student3', subject: 'Data Structures', exam: 'Midterm 1', marks: 72, maxMarks: 100 },
  { studentId: 'student3', subject: 'Algorithms', exam: 'Midterm 1', marks: 55, maxMarks: 100 },
  { studentId: 'student3', subject: 'Database Systems', exam: 'Midterm 1', marks: 68, maxMarks: 100 },
];

export const mockAnnouncements: Announcement[] = [
    { id: 'ann1', teacherId: 'dean1', teacherName: 'Dr. Evelyn Reed', content: 'Midterm exams are scheduled for next month. Please prepare accordingly.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'ann2', teacherId: 'teacher1', teacherName: 'Mr. Alan Grant', content: 'The submission deadline for the Data Structures project has been extended to this Friday.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
];

export const mockMessages: Message[] = [
    { 
        id: 'msg1', 
        senderId: 'dean1', 
        senderName: 'Dr. Evelyn Reed',
        content: 'Reminder: All faculty members of the Computer Science department are required to attend the meeting tomorrow at 10 AM.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        targetType: 'department',
        targetId: 'Computer Science',
        readBy: ['teacher1', 'teacher2']
    },
    { 
        id: 'msg2', 
        senderId: 'teacher1', 
        senderName: 'Mr. Alan Grant',
        content: 'The assignment submission portal for CS101 will be closed tonight at 11:59 PM. Please submit your work on time.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        targetType: 'class',
        targetId: 'cs101',
        readBy: []
    }
];

export const mockTasks: Task[] = [
  {
    id: 'task1',
    title: 'Data Structures Assignment 1',
    description: 'Implement a binary search tree and its traversal methods (in-order, pre-order, post-order). Submit your code and a report explaining your implementation.',
    classId: 'cs101',
    creatorId: 'teacher1',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'High',
  },
  {
    id: 'task2',
    title: 'Read Chapter 5 of Algorithms Textbook',
    description: 'Read the chapter on Dynamic Programming and summarize the key concepts. Provide at least three examples of problems that can be solved using this technique.',
    classId: 'cs101',
    creatorId: 'dean1',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'Medium',
  },
];

export const mockStudentTasks: StudentTask[] = [
  // Task 1 assigned to all students in cs101
  { id: 'stask1', taskId: 'task1', studentId: 'student1', status: 'In Progress' },
  { id: 'stask2', taskId: 'task1', studentId: 'student2', status: 'To Do' },
  { id: 'stask3', taskId: 'task1', studentId: 'student3', status: 'To Do' },
  // Task 2 assigned to student1 and student2
  { id: 'stask4', taskId: 'task2', studentId: 'student1', status: 'Completed', completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'stask5', taskId: 'task2', studentId: 'student2', status: 'In Progress' },
  { id: 'stask6', taskId: 'task2', studentId: 'student3', status: 'To Do' },
];
