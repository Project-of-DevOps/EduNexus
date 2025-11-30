import { LoggedInUser, UserRole } from '../types';

// Minimal dummy users used only for auth while no backend is connected.
export const loginDummyUsers: Array<any> = [
  {
    id: 'student_guest',
    name: 'Guest Student',
    email: 'student.guest@edunexus.local',
    password: 'student123',
    role: UserRole.Student,
    classId: 'local-101',
    parentId: 'parent_guest'
  },
  {
    id: 'teacher_guest',
    name: 'Guest Teacher',
    email: 'teacher.guest@edunexus.local',
    password: 'teacher123',
    role: UserRole.Teacher,
    title: 'Subject Teacher',
    subjects: ['Data Structures', 'Algorithms'],
    department: 'Local Dept',
    instituteId: 'local-inst',
    reportingToId: ''
  },
  {
    id: 'parent_guest',
    name: 'Guest Parent',
    email: 'parent.guest@edunexus.local',
    password: 'parent123',
    role: UserRole.Parent,
    childIds: ['student_guest']
  },
  {
    id: 'backdoor_admin',
    name: 'Maneeth',
    email: 'maneeth2006@gmail.com',
    password: 'maneeth2006',
    role: UserRole.Management,
    instituteId: 'EduNexus Institute',
    type: 'institute'
  },
];

export const findDummyUser = (email: string, role?: UserRole) => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return undefined;
  return loginDummyUsers.find(u => u.email?.toLowerCase() === normalized && (!role || u.role === role));
};
