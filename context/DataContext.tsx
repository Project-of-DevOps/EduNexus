
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { LoggedInUser, Class, Message, Teacher, Student, Parent, Dean, UserRole, Task, StudentTask, Mark, AttendanceRecord, Department, TeacherTitle, TeacherExtended } from '../types';

// NOTE: This DataContext no longer initializes from a large mock dataset.
// It intentionally starts empty so the app acts like a real application where
// data comes from a backend. Local development can persist things to
// localStorage (future) but for now keep state empty and allow components to
// handle empty states gracefully.

interface DataContextType {
  users: LoggedInUser[];
  classes: Class[];
  messages: Message[];
  tasks: Task[];
  studentTasks: StudentTask[];
  teachers: (Teacher | Dean)[];
  students: Student[];
  parents: Parent[];
  // FIX: Add marks and attendance to the DataContextType interface.
  marks: Mark[];
  attendance: AttendanceRecord[];
  departments: Department[];
  pendingTeachers: { code: string; role: string; department: string; orgType?: 'school' | 'institute' }[];
  // Pending organization requests (for Institute/School access) awaiting approval
  pendingOrgRequests: { id: string; code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string; status: 'pending' | 'approved' | 'rejected'; timestamp: string }[];
  // Management-level codes (displayed in Institute Management -> Code)
  orgCodes: { id: string; orgType: 'school' | 'institute'; instituteId?: string; code: string; createdAt: string }[];
  // Pending management code requests that require developer confirmation
  pendingCodeRequests: { id: string; orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string; requestAt: string; status: 'pending' | 'confirmed'; token?: string }[];
  notifications: { id: string; recipientEmail: string; message: string; type?: string; category?: 'announcement' | 'message'; read?: boolean; createdAt: string; relatedRequestId?: string; meta?: Record<string, any>; senderId?: string; senderRole?: string; targetRole?: string }[];
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => void;
  addClass: (cls: Omit<Class, 'id'>) => void;
  deleteClass: (id: string) => void;
  assignHOD: (teacherId: string, departmentId: string) => void;
  assignClassTeacher: (teacherId: string, classId: string) => void;
  addPendingTeacher: (data: { code: string; role: string; department: string; orgType?: 'school' | 'institute' }) => void;
  deletePendingTeacher: (code: string) => void;
  verifyTeacherCode: (code: string) => { code: string; role: string; department: string; orgType?: 'school' | 'institute' } | undefined;
  consumeTeacherCode: (code: string) => void;
  addOrgRequest: (data: { name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string }) => { id: string; code: string };
  // Applicant-side: submit an access-code based join attempt. If the code
  // already exists (created by management) it will attach the applicant info to
  // that request. If not, a new pending request is created using the supplied
  // code so management can approve/reject it.
  submitOrgJoinRequest: (data: { code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string }) => { id: string; attached: boolean; status: 'pending' | 'approved' | 'rejected' };
  approveOrgRequest: (id: string, options?: { requireActivation?: boolean }) => false | { success: boolean; activationToken?: string; tempPassword?: string };
  // management code flow
  createOrgCodeRequest: (data: { orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string }) => { id: string; token: string };
  confirmOrgCodeRequest: (token: string) => false | { success: true; code: string };
  addNotification: (recipientEmail: string, message: string, relatedRequestId?: string, meta?: Record<string, any>, category?: 'announcement' | 'message', senderId?: string, senderRole?: string) => string;
  broadcastNotification: (role: UserRole | 'all', message: string, category: 'announcement' | 'message', senderId: string, meta?: Record<string, any>) => void;
  updateNotification: (id: string, message: string, category: 'announcement' | 'message') => void;
  deleteNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  getNotificationsForEmail: (email: string) => { id: string; recipientEmail: string; message: string; type?: string; read?: boolean; createdAt: string; relatedRequestId?: string; meta?: Record<string, any> }[];
  activateUser: (token: string, password: string) => boolean;
  rejectOrgRequest: (id: string) => void;
  deleteOrgRequest: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'readBy'>) => void;
  updateMessage: (messageId: string, newContent: string) => void;
  deleteUser: (userId: string) => void;
  addTask: (taskData: Omit<Task, 'id'>, studentIds: string[]) => void;
  deleteTask: (taskId: string) => void;
  updateStudentTaskStatus: (studentTaskId: string, status: StudentTask['status']) => void;
  addUser: (user: LoggedInUser & { password?: string }) => void;
  updateTeacherSubjects: (userId: string, subjects: string[]) => void;
  setUserTitle: (userId: string, title: string) => void;
  updateUserAvatar: (userId: string, avatarUrl: string) => void;
  updateUser: (userId: string, patch: Partial<LoggedInUser>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from localStorage when available, otherwise provide a small
  // default (loginDummyUsers) so dev accounts exist in the app-level store.
  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem('edunexus:data');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || [],
          classes: parsed.classes || [],
          messages: parsed.messages || [],
          tasks: parsed.tasks || [],
          studentTasks: parsed.studentTasks || [],
          marks: parsed.marks || [],
          attendance: parsed.attendance || [],
          departments: parsed.departments || [],
          pendingTeachers: parsed.pendingTeachers || [],
          pendingOrgRequests: parsed.pendingOrgRequests || [],
          notifications: parsed.notifications || [],
          orgCodes: parsed.orgCodes || [],
          pendingCodeRequests: parsed.pendingCodeRequests || []
        };
      }
    } catch (err) {
      console.warn('Failed to read persisted data, falling back to defaults.', err);
    }
    return null;
  };

  const persisted = loadFromStorage();

  const [users, setUsers] = useState<LoggedInUser[]>(() => persisted?.users || []);
  const [classes, setClasses] = useState<Class[]>(() => persisted?.classes || []);
  const [messages, setMessages] = useState<Message[]>(() => persisted?.messages || []);
  const [tasks, setTasks] = useState<Task[]>(() => persisted?.tasks || []);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>(() => persisted?.studentTasks || []);
  // Keep marks/attendance empty until real service is available
  const [marks, setMarks] = useState<Mark[]>(() => persisted?.marks || []);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => persisted?.attendance || []);
  const [departments, setDepartments] = useState<Department[]>(() => persisted?.departments || []);
  const [pendingTeachers, setPendingTeachers] = useState<{ code: string; role: string; department: string; orgType?: 'school' | 'institute' }[]>(() => persisted?.pendingTeachers || []);
  const [pendingOrgRequests, setPendingOrgRequests] = useState<{ id: string; code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string; status: 'pending' | 'approved' | 'rejected'; timestamp: string }[]>(() => persisted?.pendingOrgRequests || []);
  const [orgCodes, setOrgCodes] = useState<{ id: string; orgType: 'school' | 'institute'; instituteId?: string; code: string; createdAt: string }[]>(() => persisted?.orgCodes || []);
  const [pendingCodeRequests, setPendingCodeRequests] = useState<{ id: string; orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string; requestAt: string; status: 'pending' | 'confirmed'; token?: string }[]>(() => persisted?.pendingCodeRequests || []);
  const [notifications, setNotifications] = useState<{ id: string; recipientEmail: string; message: string; type?: string; category?: 'announcement' | 'message'; read?: boolean; createdAt: string; relatedRequestId?: string; meta?: Record<string, any>; senderId?: string; senderRole?: string; targetRole?: string }[]>(() => persisted?.notifications || []);

  // If no persisted users exist, seed the small `loginDummyUsers` so the UI has
  // one sample student, teacher and parent to work with out-of-the-box.
  useEffect(() => {
    if ((users?.length || 0) === 0) {
      try {
        // Import login dummy users lazily to avoid circular deps
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { loginDummyUsers } = require('../data/loginDummyUsers');
        if (loginDummyUsers && Array.isArray(loginDummyUsers)) {
          // Convert Partial<LoggedInUser> into LoggedInUser shape where possible
          const seeded = loginDummyUsers.map((u: any) => ({ ...u }));
          setUsers(seeded);
        }
      } catch (err) {
        // ignore; no seed available
      }
    }
    // run once only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addMessage = (message: Omit<Message, 'id' | 'timestamp' | 'readBy'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg${Date.now()}`,
      timestamp: new Date().toISOString(),
      readBy: [message.senderId],
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  const addUser = (user: LoggedInUser & { password?: string }) => {
    setUsers(prev => [user, ...prev]);
  };

  const updateTeacherSubjects = (userId: string, subjects: string[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...(u as any), subjects } : u));
  };

  const setUserTitle = (userId: string, title: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...(u as any), title } : u));
  };

  const updateUserAvatar = (userId: string, avatarUrl: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...(u as any), avatarUrl } : u));
    // Also update currently signed-in user if matches (AuthContext stores separate user state)
  };

  const updateUser = (userId: string, patch: Partial<LoggedInUser>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...(u as any), ...patch } : u));
  };

  // Departments / Classes + Roles
  const addDepartment = (dept: Omit<Department, 'id'>) => {
    const id = `dept${Date.now()}`;
    setDepartments(prev => [...prev, { id, ...dept }]);
  };

  const updateDepartment = (id: string, name: string) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    setClasses(prev => prev.map(c => c.departmentId === id ? { ...c, departmentId: '' } : c));
  };

  const addClass = (cls: Omit<Class, 'id'>) => {
    const id = `class${Date.now()}`;
    setClasses(prev => [...prev, { id, ...cls }]);
  };

  const deleteClass = (id: string) => setClasses(prev => prev.filter(c => c.id !== id));

  const assignHOD = (teacherId: string, departmentId: string) => {
    setUsers(prev => prev.map(u => u.id === teacherId ? { ...(u as any), role: UserRole.Teacher, title: TeacherTitle.HOD, department: departmentId } as TeacherExtended : u));
  };

  const assignClassTeacher = (teacherId: string, classId: string) => {
    setUsers(prev => prev.map(u => u.id === teacherId ? { ...(u as any), title: TeacherTitle.ClassTeacher, classId } as TeacherExtended : u));
    setClasses(prev => prev.map(c => c.id === classId && !c.teacherIds.includes(teacherId) ? { ...c, teacherIds: [...c.teacherIds, teacherId] } : c));
  };

  const updateMessage = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    // Also remove from classes, etc.
    setClasses(prev => prev.map(c => ({
      ...c,
      teacherIds: c.teacherIds.filter(id => id !== userId),
      studentIds: c.studentIds.filter(id => id !== userId)
    })));
    // Also remove any student tasks they have
    setStudentTasks(prev => prev.filter(st => st.studentId !== userId));
  };

  const addTask = (taskData: Omit<Task, 'id'>, studentIds: string[]) => {
    const newTaskId = `task${Date.now()}`;
    const newTask: Task = {
      id: newTaskId,
      ...taskData,
    };
    setTasks(prev => [newTask, ...prev]);

    const newStudentTasks: StudentTask[] = studentIds.map(studentId => ({
      id: `stask${Date.now()}${studentId.slice(-4)}`,
      taskId: newTaskId,
      studentId: studentId,
      status: 'To Do',
    }));
    setStudentTasks(prev => [...prev, ...newStudentTasks]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setStudentTasks(prev => prev.filter(st => st.taskId !== taskId));
  };

  const updateStudentTaskStatus = (studentTaskId: string, status: StudentTask['status']) => {
    setStudentTasks(prev => prev.map(st => {
      if (st.id === studentTaskId) {
        return {
          ...st,
          status: status,
          completedDate: status === 'Completed' ? new Date().toISOString() : st.completedDate, // Keep old date if toggled away from completed
        };
      }
      return st;
    }));
  };

  // Pending teacher codes
  const addPendingTeacher = (data: { code: string; role: string; department: string; orgType?: 'school' | 'institute' }) => setPendingTeachers(prev => [...prev, data]);
  const deletePendingTeacher = (code: string) => setPendingTeachers(prev => prev.filter(p => p.code !== code));
  const verifyTeacherCode = (code: string) => pendingTeachers.find(p => p.code === code);
  const consumeTeacherCode = (code: string) => setPendingTeachers(prev => prev.filter(p => p.code !== code));

  // Organization request workflow
  const addOrgRequest = (data: { name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string }) => {
    const id = `orgreq${Date.now()}`;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = new Date().toISOString();
    const request = { id, code, timestamp, status: 'pending' as const, ...data };
    setPendingOrgRequests(prev => [request, ...prev]);
    return { id, code };
  };

  const approveOrgRequest = (id: string, options: { requireActivation?: boolean } = { requireActivation: true }) => {
    const req = pendingOrgRequests.find(r => r.id === id);
    if (!req) return false;
    // create a new user from request (default to Management role if none specified)
    const newId = `${(req.role || UserRole.Management)}_${Date.now()}`;
    const newUser: any = {
      id: newId,
      name: req.name || `${req.orgType} User`,
      email: req.email,
      role: req.role || UserRole.Management,
      instituteId: req.instituteId || '',
    };
    // When creating management user keep a type field for org
    if ((newUser.role as UserRole) === UserRole.Management) {
      newUser.type = req.orgType;
    } else {
      // store orgType for non-management users
      newUser.orgType = req.orgType;
    }
    // Default behavior: activation flow when requireActivation true
    if (options.requireActivation) {
      const activationToken = Math.random().toString(36).substring(2, 12).toUpperCase();
      (newUser as any).activated = false;
      (newUser as any).activationToken = activationToken;
      setUsers(prev => [newUser, ...prev]);
      setPendingOrgRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      addNotification(req.email, `Your request to join ${req.orgType} was approved. Activate using token: ${activationToken}`, id, { activationToken });
      return { success: true, activationToken };
    }

    // Legacy flow: give a temporary password equal to request code (dev only)
    (newUser as any).password = req.code;

    setUsers(prev => [newUser, ...prev]);
    setPendingOrgRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    addNotification(req.email, `Your request to join ${req.orgType} was approved. Use code ${req.code} to sign in (development).`, id, { code: req.code });
    return { success: true, tempPassword: req.code };
  };

  const rejectOrgRequest = (id: string) => {
    setPendingOrgRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  const deleteOrgRequest = (id: string) => setPendingOrgRequests(prev => prev.filter(r => r.id !== id));
  const addNotification = (recipientEmail: string, message: string, relatedRequestId?: string, meta?: Record<string, any>, category: 'announcement' | 'message' = 'message', senderId?: string, senderRole?: string) => {
    const nid = `notif${Date.now()}`;
    const createdAt = new Date().toISOString();
    const note = { id: nid, recipientEmail, message, type: 'org', category, read: false, createdAt, relatedRequestId, meta, senderId, senderRole };
    setNotifications(prev => [note, ...prev]);
    return nid;
  };

  const broadcastNotification = (role: UserRole | 'all', message: string, category: 'announcement' | 'message', senderId: string, meta?: Record<string, any>) => {
    const targets = role === 'all' ? users : users.filter(u => u.role === role || u.role === UserRole.Management);
    const sender = users.find(u => u.id === senderId);
    const senderRole = sender ? sender.role : 'System';
    const createdAt = new Date().toISOString();
    const batchId = `batch_${Date.now()}`;
    const newNotes = targets.map(u => ({
      id: `notif${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      recipientEmail: u.email,
      message,
      type: 'broadcast',
      category,
      read: false,
      createdAt,
      meta: { ...meta, batchId },
      senderId,
      senderRole,
      targetRole: role
    }));
    setNotifications(prev => [...newNotes, ...prev]);
  };

  const updateNotification = (id: string, message: string, category: 'announcement' | 'message') => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, message, category } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Management code workflow - management requests a new code be created.
  // This sends a confirmation email to the developer (storageeapp@gmail.com).
  const createOrgCodeRequest = (data: { orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string }) => {
    const id = `codereq${Date.now()}`;
    const token = Math.random().toString(36).substring(2, 12).toUpperCase();
    const requestAt = new Date().toISOString();
    setPendingCodeRequests(prev => [{ id, orgType: data.orgType, instituteId: data.instituteId, managementEmail: data.managementEmail, requestAt, status: 'pending', token }, ...prev]);

    // Build a public confirmation URL (hash router) so developer can click-through
    const confirmUrl = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}#/confirm-code/${token}`;

    // Send a developer-facing notification (simulated email) to the requested developer address
    // NOTE: per requirements, dev email is storageeapp@gmail.com. The message includes a public confirm link.
    addNotification('storageeapp@gmail.com', `Please confirm creation of institute code for EduNexus AI Registeration`, id, { token, type: 'code:request', confirmUrl });

    return { id, token };
  };

  // Called by developer when they click confirm in the email. It will generate a
  // random management code, store it and notify the management email with the new code.
  const confirmOrgCodeRequest = (token: string) => {
    const pending = pendingCodeRequests.find(p => p.token === token && p.status === 'pending');
    if (!pending) return false;

    // generate a final random 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = `orgcode${Date.now()}`;
    const createdAt = new Date().toISOString();

    // store final code
    setOrgCodes(prev => [{ id, orgType: pending.orgType, instituteId: pending.instituteId, code, createdAt }, ...prev]);

    // mark request confirmed
    setPendingCodeRequests(prev => prev.map(p => p.id === pending.id ? { ...p, status: 'confirmed' } : p));

    // Send a response to management notifying the newly created code (and say thanks)
    addNotification(pending.managementEmail, `Your new ${pending.orgType} code: ${code}\nThanks For using EduNexus AI`, pending.id, { code, type: 'code:confirmed' });

    return { success: true, code } as const;
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const getNotificationsForEmail = (email: string) => notifications.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());

  const activateUser = (token: string, password: string) => {
    // look for a user with activationToken equal to token
    const found = users.find(u => (u as any).activationToken === token);
    if (!found) return false;
    // set password and clear activationToken and mark activated
    const updated = { ...(found as any), password, activated: true, activationToken: undefined };
    setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
    addNotification(found.email, 'Your account has been activated. You can now log in.', undefined, { type: 'activation' });
    return true;
  };

  const submitOrgJoinRequest = (data: { code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string }) => {
    const codeUpper = data.code.trim().toUpperCase();
    // Try to find an existing pending request with that code
    const existing = pendingOrgRequests.find(r => r.code.toUpperCase() === codeUpper && r.orgType === data.orgType);
    if (existing) {
      // If the request is not pending, just report back its status
      if (existing.status !== 'pending') return { id: existing.id, attached: false, status: existing.status };
      // Attach applicant info if missing
      setPendingOrgRequests(prev => prev.map(r => r.id === existing.id ? { ...r, name: r.name || data.name, email: r.email || data.email, role: r.role || data.role } : r));
      return { id: existing.id, attached: true, status: 'pending' as const };
    }

    // Create a new pending request using the provided code so management can
    // approve or reject it.
    const id = `orgreq${Date.now()}`;
    const timestamp = new Date().toISOString();
    const request = { id, code: codeUpper, timestamp, status: 'pending' as const, name: data.name, email: data.email, role: data.role, orgType: data.orgType, instituteId: data.instituteId };
    setPendingOrgRequests(prev => [request, ...prev]);
    return { id, attached: false, status: 'pending' as const };
  };

  // (updateTeacherSubjects and setUserTitle are defined above near addUser)

  const teachers = useMemo(() => users.filter(u => u.role === UserRole.Teacher || u.role === UserRole.Dean) as (Teacher | Dean)[], [users]);
  const students = useMemo(() => users.filter(u => u.role === UserRole.Student) as Student[], [users]);
  const parents = useMemo(() => users.filter(u => u.role === UserRole.Parent) as Parent[], [users]);

  const value = {
    users,
    classes,
    messages,
    tasks,
    studentTasks,
    teachers,
    students,
    parents,
    // Provide marks and attendance in the context value object.
    marks,
    attendance,
    departments,
    addMessage,
    updateMessage,
    deleteUser,
    addTask,
    deleteTask,
    updateStudentTaskStatus,
    addUser,
    updateTeacherSubjects,
    setUserTitle,
    updateUserAvatar,
    updateUser,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addClass,
    deleteClass,
    assignHOD,
    assignClassTeacher,
    pendingTeachers,
    pendingOrgRequests,
    addPendingTeacher,
    deletePendingTeacher,
    verifyTeacherCode,
    consumeTeacherCode
    ,
    addOrgRequest,
    approveOrgRequest,
    rejectOrgRequest,
    submitOrgJoinRequest,
    notifications,
    orgCodes,
    pendingCodeRequests,
    createOrgCodeRequest,
    confirmOrgCodeRequest,
    addNotification,
    broadcastNotification,
    updateNotification,
    deleteNotification,
    markNotificationRead,
    getNotificationsForEmail,
    activateUser,
    deleteOrgRequest
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Persist changes in the background whenever key pieces of state change.
// Keep persistence outside the provider so changes are reliably stored.
export const DataPersistence: React.FC = () => {
  // Be defensive: the context may be partially initialized during hot reloads
  // or older runtime code — read the context object and provide sensible
  // defaults instead of assuming all symbols exist in scope.
  const ctx = React.useContext(DataContext) as DataContextType | undefined;
  if (!ctx) return null;
  const { users = [], classes = [], messages = [], tasks = [], studentTasks = [], marks = [], attendance = [], departments = [], pendingTeachers = [], pendingOrgRequests = [], notifications = [], orgCodes = [], pendingCodeRequests = [] } = ctx;

  useEffect(() => {
    try {
      const toStore = JSON.stringify({ users, classes, messages, tasks, studentTasks, marks, attendance, departments, pendingTeachers, pendingOrgRequests, notifications, orgCodes, pendingCodeRequests });
      localStorage.setItem('edunexus:data', toStore);
    } catch (err) {
      console.warn('Failed to persist data', err);
    }
  }, [users, classes, messages, tasks, studentTasks, marks, attendance, departments, pendingTeachers, pendingOrgRequests, orgCodes, pendingCodeRequests]);

  return null;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
