
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from 'docx';
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
  // Library resources (books, borrow records, requests)
  books: import('../types').Book[];
  borrowRecords: import('../types').BorrowRecord[];
  reservations: import('../types').Reservation[];
  bookRequests: import('../types').BookRequest[];
  departments: Department[];
  pendingDepartments: Department[];
  pendingClasses: Class[];
  pendingTeachers: { code: string; role: string; department: string; orgType?: 'school' | 'institute' }[];
  // Pending organization requests (for Institute/School access) awaiting approval
  pendingOrgRequests: { id: string; code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string; status: 'pending' | 'approved' | 'rejected'; timestamp: string }[];
  // Management-level codes (displayed in Institute Management -> Code)
  orgCodes: { id: string; orgType: 'school' | 'institute'; instituteId?: string; code: string; createdAt: string }[];
  // Pending management code requests that require developer confirmation
  pendingCodeRequests: { id: string; orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string; requestAt: string; status: 'pending' | 'confirmed' | 'rejected'; token?: string; rejectionReason?: string }[];
  // Analytics for org-code requests (counts etc.) when available from the server
  orgCodeAnalytics?: any;
  getOrgCodeAnalytics: () => any;
  notifications: { id: string; recipientEmail: string; message: string; type?: string; category?: 'announcement' | 'message'; read?: boolean; createdAt: string; relatedRequestId?: string; meta?: Record<string, any>; senderId?: string; senderRole?: string; targetRole?: string }[];
  auditLogs: import('../types').AuditLog[];
  damageReports: import('../types').DamageReport[];
  // Pending Management Signups Queue
  pendingManagementSignups: Array<{ id: string; name?: string; email: string; password: string; extra?: Record<string, any>; createdAt: string; attempts?: number; error?: string }>;
  addPendingManagementSignup: (data: { name?: string; email: string; password: string; extra?: Record<string, any> }) => string;
  removePendingManagementSignup: (id: string) => void;
  markPendingSignupError: (id: string, error: string) => void;
  markPendingSignupSynced: (id: string, serverUser: any) => void;
  retryPendingSignup: (id: string) => Promise<boolean>;
  cancelPendingSignup: (id: string) => void;
  // audit and damage workflows
  addAuditLog: (action: string, target?: string, actorId?: string, actorName?: string, note?: string, meta?: Record<string, any>) => string;
  reportDamage: (bookId: string, reporterId?: string, reporterName?: string, note?: string) => string;
  resolveDamage: (reportId: string, status?: 'resolved' | 'replaced', note?: string) => void;
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
  // management code flow
  createOrgCodeRequest: (data: { orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string }) => Promise<{ id: string; token: string }>;
  confirmOrgCodeRequest: (token: string) => Promise<false | { success: true; code: string }>;
  rejectOrgCodeRequest: (tokenOrId: string, reason?: string) => boolean;
  viewOrgCode: (password: string, orgType: 'school' | 'institute') => Promise<{ success: boolean; code?: string; error?: string }>;
  addNotification: (recipientEmail: string, message: string, relatedRequestId?: string, meta?: Record<string, any>, category?: 'announcement' | 'message', senderId?: string, senderRole?: string, subject?: string, body?: string) => string;
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
  // library functions
  addBook: (book: Omit<import('../types').Book, 'id' | 'createdAt'>) => string;
  updateBook: (id: string, patch: Partial<import('../types').Book>) => void;
  deleteBook: (id: string) => void;
  borrowBook: (bookId: string, borrowerId: string, borrowerName: string, dueAt?: string) => string;
  returnBook: (recordId: string) => void;
  // Reservations: students can reserve a copy when unavailable

  addReservation: (data: { bookId: string; bookTitle?: string; requesterId?: string; requesterName?: string; expiresAt?: string | null }) => string;
  cancelReservation: (id: string) => void;
  addBookRequest: (req: Omit<import('../types').BookRequest, 'id' | 'createdAt' | 'status'> & { requesterId?: string; priority?: 'low' | 'medium' | 'high' }) => string;
  // Reporting & import/export
  getTopBorrowedReport: (topN?: number) => Array<{ book: import('../types').Book; count: number }>;
  exportBooksCSV: () => string;
  importBooksFromCSV: (csv: string) => string[]; // returns created book ids
  exportBooksXLSX: (selectedBookIds?: string[], columns?: string[]) => string; // base64 xlsx
  exportBooksPDF: (selectedBookIds?: string[], columns?: string[]) => ArrayBuffer | null;
  exportBooksDOCX: (selectedBookIds?: string[], columns?: string[]) => Promise<ArrayBuffer | null>;
  // Bulk actions for librarian operations
  bulkReserve: (bookIds: string[], requesterId?: string, requesterName?: string, expiresAt?: string | null) => string[];
  bulkFulfillRequests: (requestIds: string[]) => string[];
  bulkMarkLost: (bookIds: string[], reporterId?: string, reporterName?: string, note?: string) => string[];
  bulkMarkDamaged: (bookIds: string[], reporterId?: string, reporterName?: string, note?: string) => string[];
  bulkDeleteBooks: (bookIds: string[]) => void;
  // Return top N most borrowed books (by borrow record count)
  getPopularBooks: (topN?: number) => import('../types').Book[];
  updateBookRequestStatus: (id: string, status: import('../types').BookRequest['status']) => void;
  updateBookRequestPriority: (id: string, priority: 'low' | 'medium' | 'high') => void;
  fulfillRequestAndReserve: (requestId: string) => boolean;
  markBookLost: (bookId: string, reporterId?: string, reporterName?: string, note?: string) => string;
  markBookDamaged: (bookId: string, reporterId?: string, reporterName?: string, note?: string) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from backend API
  useEffect(() => {
    // Avoid trying to fetch dashboard data when running under tests or
    // when not in a browser environment — tests run in Node and should not
    // attempt to contact the backend by default.
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
    const fetchDashboardData = async () => {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      try {
        const resp = await fetch(`${apiUrl}/api/dashboard-data`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (resp.ok) {
          const data = await resp.json();
          setDepartments(data.departments || []);
          setClasses(data.classes || []);
          setOrgCodes(data.orgCodes || []);
          if (data.teachers) {
            setUsers(prev => {
              const others = prev.filter(u => u.role !== UserRole.Teacher && u.role !== UserRole.Dean);
              return [...others, ...data.teachers];
            });
          }
        }

        // Try to fetch any pending org-code requests and code analytics for the management/developer UI
        try {
          const reqs = await fetch(`${apiUrl}/api/org-code/requests`, { credentials: 'include' });
          if (reqs.ok) {
            const json = await reqs.json().catch(() => null);
            if (json && json.success && Array.isArray(json.rows)) setPendingCodeRequestsSync(json.rows.map((r: any) => ({ id: r.id || `srv_${Date.now()}`, orgType: r.orgtype || r.orgType, instituteId: r.institute_id || r.instituteId, managementEmail: r.management_email || r.managementEmail, requestAt: r.created_at || new Date().toISOString(), status: r.status || 'pending', token: r.token })));
          }
        } catch (err) {
          // best effort — ignore if server unavailable
        }

        try {
          const analytics = await fetch(`${apiUrl}/api/org-code/analytics`, { credentials: 'include' });
          if (analytics.ok) {
            const json = await analytics.json().catch(() => null);
            if (json && json.success) setOrgCodeAnalytics(json);
          }
        } catch (err) {
          // ignore
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchDashboardData();
  }, []);

  // Load persisted state from localStorage when available. This lets the
  // app continue to operate (and retain queued items) if the backend/psql is
  // unreachable or the developer shuts the server down.
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('edunexus:data');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      // Corrupt persisted data -> ignore and start fresh
      console.warn('Failed reading persisted edunexus:data', err);
      return null;
    }
  })();

  const [users, setUsers] = useState<LoggedInUser[]>(() => persisted?.users || []);
  const [classes, setClasses] = useState<Class[]>(() => persisted?.classes || []);
  const [messages, setMessages] = useState<Message[]>(() => persisted?.messages || []);
  const [tasks, setTasks] = useState<Task[]>(() => persisted?.tasks || []);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>(() => persisted?.studentTasks || []);
  // Keep marks/attendance empty until real service is available
  const [marks, setMarks] = useState<Mark[]>(() => persisted?.marks || []);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => persisted?.attendance || []);
  const [books, setBooks] = useState<import('../types').Book[]>(() => persisted?.books || []);
  const [borrowRecords, setBorrowRecords] = useState<import('../types').BorrowRecord[]>(() => persisted?.borrowRecords || []);
  const [reservations, setReservations] = useState<import('../types').Reservation[]>(() => persisted?.reservations || []);
  const [bookRequests, setBookRequests] = useState<import('../types').BookRequest[]>(() => persisted?.bookRequests || []);
  const [departments, setDepartments] = useState<Department[]>(() => persisted?.departments || []);
  const [pendingDepartments, setPendingDepartments] = useState<Department[]>(() => persisted?.pendingDepartments || []);
  const [pendingClasses, setPendingClasses] = useState<Class[]>(() => persisted?.pendingClasses || []);
  const [pendingTeachers, setPendingTeachers] = useState<{ code: string; role: string; department: string; orgType?: 'school' | 'institute' }[]>(() => persisted?.pendingTeachers || []);
  const [pendingOrgRequests, setPendingOrgRequests] = useState<{ id: string; code: string; name?: string; email: string; role?: UserRole; orgType: 'school' | 'institute'; instituteId?: string; status: 'pending' | 'approved' | 'rejected'; timestamp: string }[]>(() => persisted?.pendingOrgRequests || []);
  // Keep a synchronous ref mirror so callers that create a request and then
  // immediately act on it can see the newly-created entry without waiting for
  // the next render. This reduces flakiness in tests and immediate workflows.
  const pendingOrgRequestsRef = React.useRef(pendingOrgRequests);

  const setPendingOrgRequestsSync = (updater: any) => {
    // Accept either a value or an updater function like setState
    const next = typeof updater === 'function' ? updater(pendingOrgRequestsRef.current) : updater;
    pendingOrgRequestsRef.current = next;
    setPendingOrgRequests(next);
  };
  const [orgCodes, setOrgCodes] = useState<{ id: string; orgType: 'school' | 'institute'; instituteId?: string; code: string; createdAt: string }[]>(() => persisted?.orgCodes || []);
  // Queue for management signups created while server is unreachable. Each item
  // includes name,email,password,extra and will be retried in the background
  // until synced with the API.
  const [pendingManagementSignups, setPendingManagementSignups] = useState<Array<{ id: string; name?: string; email: string; password: string; extra?: Record<string, any>; createdAt: string; attempts?: number; error?: string }>>(() => persisted?.pendingManagementSignups || []);
  const [pendingCodeRequests, setPendingCodeRequests] = useState<{ id: string; orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string; requestAt: string; status: 'pending' | 'confirmed' | 'rejected'; token?: string; rejectionReason?: string }[]>(() => persisted?.pendingCodeRequests || []);
  const [orgCodeAnalytics, setOrgCodeAnalytics] = useState<any>(() => persisted?.orgCodeAnalytics || null);
  const [auditLogs, setAuditLogs] = useState<import('../types').AuditLog[]>(() => persisted?.auditLogs || []);
  const [damageReports, setDamageReports] = useState<import('../types').DamageReport[]>(() => persisted?.damageReports || []);
  const pendingCodeRequestsRef = React.useRef(pendingCodeRequests);

  const setPendingCodeRequestsSync = (updater: any) => {
    const next = typeof updater === 'function' ? updater(pendingCodeRequestsRef.current) : updater;
    pendingCodeRequestsRef.current = next;
    setPendingCodeRequests(next);
  };
  const [notifications, setNotifications] = useState<{ id: string; recipientEmail: string; message: string; type?: string; category?: 'announcement' | 'message'; read?: boolean; createdAt: string; relatedRequestId?: string; meta?: Record<string, any>; senderId?: string; senderRole?: string; targetRole?: string }[]>(() => persisted?.notifications || []);
  const notificationsRef = React.useRef(notifications);

  const setNotificationsSync = (updater: any) => {
    const next = typeof updater === 'function' ? updater(notificationsRef.current) : updater;
    notificationsRef.current = next;
    setNotifications(next);
  };




  const addMessage = (message: Omit<Message, 'id' | 'timestamp' | 'readBy'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg${Date.now()}`,
      timestamp: new Date().toISOString(),
      readBy: [message.senderId],
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  // Pending management signup queue operations
  const addPendingManagementSignup = (data: { name?: string; email: string; password: string; extra?: Record<string, any> }) => {
    const id = `pending_signup_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const item = { id, name: data.name, email: (data.email || '').toLowerCase(), password: data.password, extra: data.extra, createdAt, attempts: 0 };
    setPendingManagementSignups(prev => [item, ...prev]);

    // Attempt server-side persistence (best effort)
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/queue-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'Management' })
    }).catch(err => console.warn('Failed to persist queue item to server', err));

    return id;
  };

  const removePendingManagementSignup = (id: string) => setPendingManagementSignups(prev => prev.filter(p => p.id !== id));

  const markPendingSignupError = (id: string, error: string) => setPendingManagementSignups(prev => prev.map(p => p.id === id ? { ...p, attempts: (p.attempts || 0) + 1, error } : p));

  const markPendingSignupSynced = (id: string, serverUser: any) => {
    // add user to local store and remove from queue
    try {
      const local = { ...serverUser, password: undefined };
      setUsers(prev => {
        // replace any existing local user with same email+role
        const lowerEmail = (local.email || '').toLowerCase();
        const filtered = prev.filter(u => !(u.email.toLowerCase() === lowerEmail && u.role === local.role));
        return [local as any, ...filtered];
      });
    } catch (e) {
      // ignore
    }
    setPendingManagementSignups(prev => prev.filter(p => p.id !== id));
    // notify the management email that their account is now persisted server-side
    try {
      addNotification(serverUser.email || '', `Your account has been created and synchronized to the server. You can now sign in using your credentials.`, undefined, { type: 'signup:sync' }, 'message', undefined, undefined, 'Your EduNexus account is active', `Hi ${serverUser.name || ''},\n\nYour account has been created and synchronized to the server. You can now sign in using your credentials.\n\nThanks,\nEduNexus AI`);
    } catch (e) {
      // ignore - best effort only
    }
  };

  const retryPendingSignup = async (id: string) => {
    const item = pendingManagementSignups.find(p => p.id === id);
    if (!item) return false;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Queued-Signup': '1' },
        body: JSON.stringify({ name: item.name || undefined, email: item.email, password: item.password, role: 'Management', extra: item.extra || {} })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => resp.statusText);
        markPendingSignupError(id, String(txt || 'server error'));
        return false;
      }
      const json = await resp.json().catch(() => null);
      if (json && json.success && json.user) {
        markPendingSignupSynced(id, json.user);
        return true;
      }
      markPendingSignupError(id, 'invalid response');
      return false;
    } catch (err: any) {
      markPendingSignupError(id, String(err?.message || 'network error'));
      return false;
    }
  };

  const cancelPendingSignup = (id: string) => {
    removePendingManagementSignup(id);
  };

  // audit and damage workflows
  const addAuditLog = (action: string, target?: string, actorId?: string, actorName?: string, note?: string, meta?: Record<string, any>) => {
    const id = `audit_${Date.now()}`;
    const entry = { id, action, target, actorId, actorName, timestamp: new Date().toISOString(), note, meta } as import('../types').AuditLog;
    setAuditLogs(prev => [entry, ...prev]);
    return id;
  };

  const reportDamage = (bookId: string, reporterId?: string, reporterName?: string, note?: string) => {
    const id = `dam_${Date.now()}`;
    const now = new Date().toISOString();
    const rep = { id, bookId, reporterId, reporterName, reportedAt: now, status: 'reported' as const, note } as import('../types').DamageReport;
    setDamageReports(prev => [rep, ...prev]);
    addAuditLog('mark_reported', bookId, reporterId, reporterName, note, { reportId: id });
    return id;
  };

  const resolveDamage = (reportId: string, status: 'resolved' | 'replaced' = 'resolved', note?: string) => {
    setDamageReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    const rep = damageReports.find(r => r.id === reportId);
    if (rep) addAuditLog('mark_resolved', rep.bookId, undefined, undefined, note, { reportId, status });
    // if replaced, decrement total copies and adjust available
    if (status === 'replaced' && rep) {
      // when replaced we assume a new copy is added (or the damaged copy was replaced) — adjust counts conservatively
      setBooks(prev => prev.map(b => b.id === rep.bookId ? { ...b, totalCopies: (b.totalCopies || 1), availableCopies: (b.availableCopies || 0) } : b));
    }
  };

  const markBookLost = (bookId: string, reporterId?: string, reporterName?: string, note?: string) => {
    // decrement totalCopies and availableCopies conservatively
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, totalCopies: Math.max(0, (b.totalCopies || 1) - 1), availableCopies: Math.max(0, (b.availableCopies || 0) - 1) } : b));
    const repId = reportDamage(bookId, reporterId, reporterName, note || 'Reported lost');
    // mark resolved as replaced to indicate replacement processed
    resolveDamage(repId, 'replaced', note || 'Marked lost');
    addAuditLog('mark_lost', bookId, reporterId, reporterName, note);
    return repId;
  };

  const markBookDamaged = (bookId: string, reporterId?: string, reporterName?: string, note?: string) => {
    // when damaged, mark unavailable until resolved
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, availableCopies: Math.max(0, (b.availableCopies || 0) - 1) } : b));
    const repId = reportDamage(bookId, reporterId, reporterName, note || 'Reported damaged');
    addAuditLog('mark_damaged', bookId, reporterId, reporterName, note);
    return repId;
  };

  // Background retry: try to send pending management signups to the API.
  // This is conservative: we cap attempts to avoid infinite retries.
  useEffect(() => {
    // Sync Pending Departments
    if (pendingDepartments.length > 0) {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      pendingDepartments.forEach(async (dept) => {
        try {
          const resp = await fetch(`${apiUrl}/api/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: dept.name, instituteId: dept.instituteId })
          });
          if (resp.ok) {
            const data = await resp.json();
            // Remove from pending
            setPendingDepartments(prev => prev.filter(p => p.id !== dept.id));
            // Update main list with real ID (if needed, though we might just keep the local one if we don't want to disrupt UI)
            // For now, let's just ensure it's saved. The server returns the created object.
            // Ideally we should swap the local ID with the server ID in the 'departments' list too.
            if (data.department) {
              setDepartments(prev => prev.map(d => d.id === dept.id ? data.department : d));
            }
          }
        } catch (e) {
          // ignore, retry later
        }
      });
    }

    // Sync Pending Classes
    if (pendingClasses.length > 0) {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      pendingClasses.forEach(async (cls) => {
        try {
          // Clean payload: avoid sending undefined/null fields which some servers
          // may reject. Only include keys that have meaningful values.
          const payload: any = { name: cls.name };
          if (cls.departmentId != null && String(cls.departmentId).trim() !== '') payload.departmentId = cls.departmentId;
          if (cls.instituteId != null && String(cls.instituteId).trim() !== '') payload.instituteId = cls.instituteId;

          const resp = await fetch(`${apiUrl}/api/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
          });

          if (resp.ok) {
            const data = await resp.json().catch(() => null);
            setPendingClasses(prev => prev.filter(p => p.id !== cls.id));
            if (data && data.class) {
              setClasses(prev => prev.map(c => c.id === cls.id ? data.class : c));
            }
          } else {
            // Non-OK response: log a warning so developer can inspect later.
            const text = await resp.text().catch(() => resp.statusText || '');
            console.warn('Failed to sync pending class, server responded:', resp.status, text);
          }
        } catch (e) {
          // network/server error — keep the item in the queue and log for diagnostics
          console.warn('Failed to persist pending class to server, will retry later', e);
        }
      });
    }

    if (!pendingManagementSignups || pendingManagementSignups.length === 0) return;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

    let aborted = false;

    const trySync = async (item: typeof pendingManagementSignups[number]) => {
      if (!item || item.attempts && item.attempts >= 5) return;
      try {
        const resp = await fetch(`${apiUrl}/api/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Queued-Signup': '1' },
          body: JSON.stringify({ name: item.name || undefined, email: item.email, password: item.password, role: 'Management', extra: item.extra || {} })
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText || 'signup failed');
          markPendingSignupError(item.id, String(text || 'server error'));
          return;
        }
        const json = await resp.json().catch(() => null);
        if (json && json.success && json.user) {
          // mark synced & store server user locally
          markPendingSignupSynced(item.id, json.user);
        } else {
          markPendingSignupError(item.id, 'invalid response');
        }
      } catch (err: any) {
        // network error — increment attempts and keep in queue
        if (!aborted) markPendingSignupError(item.id, String(err?.message || 'network error'));
      }
    };

    // start per-item syncs (do not block main thread)
    pendingManagementSignups.slice().reverse().forEach(item => void trySync(item));

    // try again when window becomes online
    const onOnline = () => pendingManagementSignups.slice().reverse().forEach(item => void trySync(item));
    window.addEventListener('online', onOnline);

    return () => {
      aborted = true;
      window.removeEventListener('online', onOnline);
    };
  }, [pendingManagementSignups]);

  // Overdue detection: mark borrow records overdue and notify borrowers
  useEffect(() => {
    if (!borrowRecords || borrowRecords.length === 0) return;

    let aborted = false;

    const now = Date.now();
    const toMark: string[] = [];
    borrowRecords.forEach(r => {
      if (r.status === 'borrowed' && r.dueAt) {
        const dueTS = Date.parse(r.dueAt);
        if (!isNaN(dueTS) && dueTS < now) {
          toMark.push(r.id);
        }
      }
    });

    if (toMark.length > 0) {
      setBorrowRecords(prev => prev.map(r => toMark.includes(r.id) ? { ...r, status: 'overdue' } : r));
      // Notify borrowers
      toMark.forEach(id => {
        const rec = borrowRecords.find(r => r.id === id);
        if (rec && rec.borrowerId) {
          const email = users.find(u => u.id === rec.borrowerId)?.email || '';
          try {
            if (email) addNotification(email, `Your borrowed book "${rec.bookTitle}" is overdue. Please return it or contact the library to extend.`, rec.id, { overdue: true }, 'message');
          } catch (e) { /* ignore */ }
        }
      });
    }

    // check every 60 seconds while app is open
    const timer = setInterval(() => {
      if (aborted) return;
      const now2 = Date.now();
      const overdueIds: string[] = [];
      borrowRecords.forEach(r => {
        if (r.status === 'borrowed' && r.dueAt) {
          const dueTS = Date.parse(r.dueAt);
          if (!isNaN(dueTS) && dueTS < now2) overdueIds.push(r.id);
        }
      });
      if (overdueIds.length > 0) {
        setBorrowRecords(prev => prev.map(r => overdueIds.includes(r.id) ? { ...r, status: 'overdue' } : r));
        overdueIds.forEach(id => {
          const rec = borrowRecords.find(r => r.id === id);
          if (rec && rec.borrowerId) {
            const email = users.find(u => u.id === rec.borrowerId)?.email || '';
            if (email) addNotification(email, `Your borrowed book "${rec.bookTitle}" is overdue. Please return it or contact the library to extend.`, rec.id, { overdue: true }, 'message');
          }
        });
      }
    }, 60 * 1000);

    return () => {
      aborted = true;
      clearInterval(timer);
    };
  }, [borrowRecords, users]);

  const addUser = (user: LoggedInUser & { password?: string }) => {
    setUsers(prev => [user, ...prev]);
  };

  // Library helpers
  const addBook = (book: Omit<import('../types').Book, 'id' | 'createdAt'>) => {
    const id = `book_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const b = { id, createdAt, ...book, totalCopies: book.totalCopies || 1, availableCopies: book.availableCopies ?? (book.totalCopies || 1) } as import('../types').Book;
    setBooks(prev => [b, ...prev]);
    return id;
  };

  // Reservations
  const addReservation = (data: { bookId: string; bookTitle?: string; requesterId?: string; requesterName?: string; expiresAt?: string | null }) => {
    const id = `res_${Date.now()}`;
    const reservedAt = new Date().toISOString();
    // default expiry: 3 days from notification if not specified
    const expiresAt = data.expiresAt ?? null;
    const r = { id, bookId: data.bookId, bookTitle: data.bookTitle, requesterId: data.requesterId, requesterName: data.requesterName, reservedAt, expiresAt, status: 'active' as const };
    setReservations(prev => [r, ...prev]);
    // optionally notify librarians
    const libs = users.filter(u => u.role === UserRole.Librarian);
    libs.forEach(l => addNotification(l.email, `New reservation for ${data.bookTitle || data.bookId} by ${data.requesterName || data.requesterId}`, undefined, { reservationId: id, bookId: data.bookId }, 'message'));
    return id;
  };

  const cancelReservation = (id: string) => setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));

  const updateBook = (id: string, patch: Partial<import('../types').Book>) => setBooks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const deleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    // remove any borrowRecords referencing this book
    setBorrowRecords(prev => prev.filter(r => r.bookId !== id));
  };

  const borrowBook = (bookId: string, borrowerId: string, borrowerName: string, dueAt?: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book || (book.availableCopies || 0) <= 0) return '';
    const id = `borrow_${Date.now()}`;
    const borrowedAt = new Date().toISOString();
    const record: import('../types').BorrowRecord = { id, bookId, bookTitle: book.title, borrowerId, borrowerName, borrowedAt, dueAt: dueAt || undefined, returnedAt: null, status: 'borrowed' };
    setBorrowRecords(prev => [record, ...prev]);
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, availableCopies: (b.availableCopies || 0) - 1 } : b));
    return id;
  };

  const returnBook = (recordId: string) => {
    setBorrowRecords(prev => prev.map(r => r.id === recordId ? { ...r, returnedAt: new Date().toISOString(), status: 'returned' } : r));
    // increase book availableCopies
    const rec = borrowRecords.find(r => r.id === recordId);
    if (rec) {
      setBooks(prev => prev.map(b => b.id === rec.bookId ? { ...b, availableCopies: (b.availableCopies || 0) + 1 } : b));
      // when a book becomes available, first check for pending requests for this title and fulfill highest-priority request
      const book = books.find(b => b.id === rec.bookId);
      const pendingRequests = bookRequests.filter(r => r.status === 'pending' && (r.bookTitle || '').toLowerCase() === (book?.title || '').toLowerCase());
      if (pendingRequests.length > 0) {
        // prioritize by priority (high > medium > low), then earliest createdAt
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const chosen = pendingRequests.sort((a, b) => {
          const pa = priorityOrder[(a as any).priority || 'medium'] || 2;
          const pb = priorityOrder[(b as any).priority || 'medium'] || 2;
          if (pa !== pb) return pb - pa; // higher priority first
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        })[0];
        if (chosen) {
          // fulfill request and create a reservation for requester
          // mark request fulfilled
          setBookRequests(prev => prev.map(r => r.id === chosen.id ? { ...r, status: 'fulfilled' } : r));
          const resId = addReservation({ bookId: rec.bookId, bookTitle: chosen.bookTitle, requesterId: chosen.requesterId, requesterName: chosen.requesterName });
          // hold the reserved copy
          setBooks(prev => prev.map(b => b.id === rec.bookId ? { ...b, availableCopies: Math.max(0, (b.availableCopies || 0) - 1) } : b));
          if (chosen.requesterId) {
            const email = users.find(u => u.id === chosen.requesterId)?.email || '';
            if (email) addNotification(email, `Your requested book "${chosen.bookTitle}" is now available and reserved for you (reservation ${resId}).`, chosen.id, { reservationId: resId }, 'message');
          }
          return;
        }
      }

      // otherwise check reservations and notify the earliest active reserver
      const activeReservations = reservations.filter(r => r.bookId === rec.bookId && r.status === 'active');
      if (activeReservations.length > 0) {
        // sort by reservedAt
        const earliest = activeReservations.sort((a, b) => (a.reservedAt || '').localeCompare(b.reservedAt || ''))[0];
        if (earliest) {
          // notify requester that book is available and set status to notified (they have to act)
          try {
            addNotification(earliest.requesterId ? (users.find(u => u.id === earliest.requesterId)?.email || '') : '', `A book you reserved (${earliest.bookTitle || rec.bookTitle}) is now available. Please borrow it or cancel the reservation.`, undefined, { reservationId: earliest.id, bookId: earliest.bookId }, 'message');
            setReservations(prev => prev.map(r => r.id === earliest.id ? { ...r, status: 'notified' } : r));
          } catch (e) {
            // ignore notification failures
          }
        }
      }
    }
  };

  const addBookRequest = (req: Omit<import('../types').BookRequest, 'id' | 'createdAt' | 'status'> & { requesterId?: string, priority?: 'low' | 'medium' | 'high' }) => {
    const id = `breq_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const r = { id, requesterId: req.requesterId, requesterName: req.requesterName, bookTitle: req.bookTitle, reason: req.reason, priority: req.priority || 'medium', status: 'pending' as const, createdAt } as import('../types').BookRequest & { priority?: 'low' | 'medium' | 'high' };
    setBookRequests(prev => [r, ...prev]);
    // notify librarian users (all users with role Librarian)
    const libs = users.filter(u => u.role === UserRole.Librarian);
    libs.forEach(l => addNotification(l.email, `New book request from ${req.requesterName || 'Student'}: ${req.bookTitle}`, id, { request: r }, 'message'));
    return id;
  };

  // allow updating priority/triage on existing requests
  const updateBookRequestPriority = (id: string, priority: 'low' | 'medium' | 'high') => {
    setBookRequests(prev => prev.map(r => r.id === id ? { ...r, priority } : r));
  };

  const getPopularBooks = (topN: number = 5) => {
    // Build counts by bookId
    const counts: Record<string, number> = {};
    borrowRecords.forEach(r => {
      counts[r.bookId] = (counts[r.bookId] || 0) + 1;
    });
    // sort books by counts
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([id]) => id);
    // return matching book objects in that order
    return sorted.map(id => books.find(b => b.id === id)).filter(Boolean) as import('../types').Book[];
  };

  const updateBookRequestStatus = (id: string, status: import('../types').BookRequest['status']) => {
    setBookRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  // Immediately fulfill a pending request by creating a reservation for the requester
  const fulfillRequestAndReserve = (requestId: string) => {
    const req = bookRequests.find(r => r.id === requestId);
    if (!req || req.status !== 'pending') return false;
    // find a matching book by title
    const book = books.find(b => (b.title || '').toLowerCase() === (req.bookTitle || '').toLowerCase());
    // mark request fulfilled
    setBookRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'fulfilled' } : r));
    // if book present and has copies, create reservation and decrement availableCopies
    if (book) {
      const resId = addReservation({ bookId: book.id, bookTitle: book.title, requesterId: req.requesterId, requesterName: req.requesterName });
      // reserve consumes an available copy (hold it)
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, availableCopies: Math.max(0, (b.availableCopies || 0) - 1) } : b));
      // notify requester
      if (req.requesterId) {
        const email = users.find(u => u.id === req.requesterId)?.email || '';
        if (email) addNotification(email, `Your request for "${req.bookTitle}" is fulfilled and reserved for you. Reservation id: ${resId}`, requestId, { reservationId: resId }, 'message');
      }
      return true;
    }
    return true;
  };

  // Reporting helpers
  const getTopBorrowedReport = (topN: number = 10) => {
    const counts: Record<string, number> = {};
    borrowRecords.forEach(r => { counts[r.bookId] = (counts[r.bookId] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN);
    return sorted.map(([bookId, count]) => ({ book: books.find(b => b.id === bookId) as import('../types').Book, count })).filter(x => !!x.book);
  };

  // CSV helpers — export/import basic CSV for books. CSV uses simple comma escape rules.
  const exportBooksCSV = () => {
    const headers = ['id', 'title', 'author', 'publisher', 'isbn', 'category', 'totalCopies', 'availableCopies', 'tags', 'createdAt'];
    const lines = [headers.join(',')];
    books.forEach(b => {
      const tags = Array.isArray(b.tags) ? JSON.stringify(b.tags) : String(b.tags || '');
      const row = [b.id, b.title, b.author || '', b.publisher || '', b.isbn || '', b.category || '', String(b.totalCopies || 0), String(b.availableCopies || 0), tags, b.createdAt || ''];
      // Escape any values that contain commas or quotes
      const escaped = row.map(cell => {
        const s = String(cell || '');
        if (s.includes(',') || s.includes('\"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      });
      lines.push(escaped.join(','));
    });
    return lines.join('\n');
  };

  const defaultColumns = ['title', 'author', 'isbn', 'publisher', 'category', 'totalCopies', 'availableCopies', 'createdAt'];

  // Export to XLSX (base64 string)
  const exportBooksXLSX = (selectedBookIds?: string[], columns: string[] = defaultColumns) => {
    const rows = (selectedBookIds && selectedBookIds.length > 0 ? books.filter(b => selectedBookIds.includes(b.id)) : books).map(b => {
      const r: any = {};
      columns.forEach(c => { r[c] = (b as any)[c] ?? ''; });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Books');
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return base64;
  };

  // Export to PDF — returns an ArrayBuffer
  const exportBooksPDF = (selectedBookIds?: string[], columns: string[] = defaultColumns) => {
    try {
      const rows = (selectedBookIds && selectedBookIds.length > 0 ? books.filter(b => selectedBookIds.includes(b.id)) : books).map(b => {
        const r: any = {};
        columns.forEach(c => { r[c] = (b as any)[c] ?? ''; });
        return r;
      });
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = 40;
      doc.setFontSize(14);
      doc.text('Book Inventory Export', 40, y);
      y += 20;
      doc.setFontSize(10);
      // header
      doc.text(columns.join(' | '), margin, y);
      y += 14;
      rows.forEach(r => {
        const line = columns.map(c => String(r[c] ?? '')).join(' | ');
        doc.text(line.substring(0, 1000), margin, y);
        y += 12;
        if (y > 760) { doc.addPage(); y = 40; }
      });
      const ab = doc.output('arraybuffer');
      return ab;
    } catch (e) {
      return null;
    }
  };

  // Export to DOCX — returns ArrayBuffer via Packer
  const exportBooksDOCX = async (selectedBookIds?: string[], columns: string[] = defaultColumns): Promise<ArrayBuffer | null> => {
    try {
      const rows = (selectedBookIds && selectedBookIds.length > 0 ? books.filter(b => selectedBookIds.includes(b.id)) : books).map(b => {
        const r: any = {};
        columns.forEach(c => { r[c] = (b as any)[c] ?? ''; });
        return r;
      });
      const tableRows: TableRow[] = [];
      // header
      const headerRow = new TableRow({ children: columns.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: true })] })] })) });
      tableRows.push(headerRow);
      rows.forEach(r => {
        const tr = new TableRow({ children: columns.map(c => new TableCell({ children: [new Paragraph(String(r[c] || ''))] })) });
        tableRows.push(tr);
      });
      const doc = new Document({ sections: [{ children: [new Paragraph({ text: 'Book Inventory Export', heading: 'Heading1' }), new Table({ rows: tableRows })] }] });
      const buf = await Packer.toBuffer(doc);
      // Packer.toBuffer returns a Node Buffer. Convert to ArrayBuffer to match
      // the declared return type `Promise<ArrayBuffer | null>` in the context.
      try {
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        return ab as ArrayBuffer;
      } catch (e) {
        // Fallback: if conversion fails, return null so callers handle absence.
        return null;
      }
    } catch (e) {
      return null;
    }
  };

  const importBooksFromCSV = (csv: string) => {
    if (!csv || !csv.trim()) return [];
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    // assume first line is header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const createdIds: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      // simple CSV parse: split by comma unless quoted
      const parts: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let ch of lines[i]) {
        if (ch === '"') {
          inQuotes = !inQuotes;
          cur += ch; // include quote so inner JSON arrays remain parseable
          continue;
        }
        if (ch === ',' && !inQuotes) {
          parts.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
      }
      if (cur.length) parts.push(cur);

      const values = parts.map(p => p.trim().replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"'));
      const row: any = {};
      header.forEach((h, idx) => row[h] = values[idx] || '');
      try {
        const tags = row.tags ? JSON.parse(row.tags) : undefined;
        const created = addBook({ title: row.title || 'Untitled', author: row.author || '', publisher: row.publisher || '', isbn: row.isbn || '', category: row.category || '', totalCopies: Number(row.totalcopies || row.totalCopies || 1) || 1, availableCopies: Number(row.availablecopies || row.availableCopies || row.totalCopies || 1) || 1, tags });
        createdIds.push(created);
      } catch (e) {
        // skip row on parse error
        continue;
      }
    }
    return createdIds;
  };

  // Bulk librarian actions
  const bulkReserve = (bookIds: string[], requesterId?: string, requesterName?: string, expiresAt?: string | null) => {
    const created: string[] = [];
    bookIds.forEach(id => {
      const book = books.find(b => b.id === id);
      if (!book) return;
      const rId = addReservation({ bookId: id, bookTitle: book.title, requesterId, requesterName, expiresAt });
      created.push(rId);
    });
    return created;
  };

  const bulkFulfillRequests = (requestIds: string[]) => {
    const fulfilled: string[] = [];
    requestIds.forEach(rid => {
      const ok = fulfillRequestAndReserve(rid as string);
      if (ok) fulfilled.push(rid);
    });
    return fulfilled;
  };

  const bulkMarkLost = (bookIds: string[], reporterId?: string, reporterName?: string, note?: string) => {
    const created: string[] = [];
    bookIds.forEach(id => {
      const rep = markBookLost(id, reporterId, reporterName, note);
      if (rep) created.push(rep);
    });
    return created;
  };

  const bulkMarkDamaged = (bookIds: string[], reporterId?: string, reporterName?: string, note?: string) => {
    const created: string[] = [];
    bookIds.forEach(id => {
      const rep = markBookDamaged(id, reporterId, reporterName, note);
      if (rep) created.push(rep);
    });
    return created;
  };

  const bulkDeleteBooks = (bookIds: string[]) => {
    bookIds.forEach(id => deleteBook(id));
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
  const addDepartment = async (dept: Omit<Department, 'id'>) => {
    const id = `dept_local_${Date.now()}`;
    const newDept = { ...dept, id };
    // Optimistic Update
    setDepartments(prev => [...prev, newDept]);

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dept)
      });
      if (resp.ok) {
        const data = await resp.json();
        // Replace local with server version
        setDepartments(prev => prev.map(d => d.id === id ? data.department : d));
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      console.warn('Failed to add department online, queuing offline', e);
      setPendingDepartments(prev => [...prev, newDept]);
    }
  };

  const updateDepartment = (id: string, name: string) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    setClasses(prev => prev.map(c => c.departmentId === id ? { ...c, departmentId: '' } : c));
  };

  const addClass = async (cls: Omit<Class, 'id'>) => {
    const id = `class_local_${Date.now()}`;
    const newClass = { ...cls, id };
    // Optimistic Update
    setClasses(prev => [...prev, newClass]);

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cls)
      });
      if (resp.ok) {
        const data = await resp.json();
        // Replace local with server version
        setClasses(prev => prev.map(c => c.id === id ? data.class : c));
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      console.warn('Failed to add class online, queuing offline', e);
      setPendingClasses(prev => [...prev, newClass]);
    }
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
    // update ref and state synchronously to avoid races where a caller
    // immediately tries to act on the newly created request
    setPendingOrgRequestsSync(prev => [request, ...prev]);
    return { id, code };
  };

  const approveOrgRequest = (id: string, options: { requireActivation?: boolean } = { requireActivation: true }) => {
    const req = pendingOrgRequestsRef.current.find(r => r.id === id) || pendingOrgRequests.find(r => r.id === id);
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
      setPendingOrgRequestsSync(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      addNotification(req.email, `Your request to join ${req.orgType} was approved. Activate using token: ${activationToken}`, id, { activationToken });
      return { success: true, activationToken };
    }

    // Legacy flow: give a temporary password equal to request code (dev only)
    (newUser as any).password = req.code;

    setUsers(prev => [newUser, ...prev]);
    setPendingOrgRequestsSync(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    addNotification(req.email, `Your request to join ${req.orgType} was approved. Use code ${req.code} to sign in (development).`, id, { code: req.code });
    return { success: true, tempPassword: req.code };
  };

  const rejectOrgRequest = (id: string) => {
    setPendingOrgRequestsSync(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  const deleteOrgRequest = (id: string) => setPendingOrgRequestsSync(prev => prev.filter(r => r.id !== id));
  const addNotification = (recipientEmail: string, message: string, relatedRequestId?: string, meta?: Record<string, any>, category: 'announcement' | 'message' = 'message', senderId?: string, senderRole?: string, subject?: string, body?: string) => {
    const nid = `notif${Date.now()}`;
    const createdAt = new Date().toISOString();
    const note: any = { id: nid, recipientEmail, message, subject: subject || undefined, body: body || undefined, type: 'org', category, read: false, createdAt, relatedRequestId, meta, senderId, senderRole };
    setNotificationsSync(prev => [note, ...prev]);
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
    setNotificationsSync(prev => [...newNotes, ...prev]);
  };

  const updateNotification = (id: string, message: string, category: 'announcement' | 'message') => {
    setNotificationsSync(prev => prev.map(n => n.id === id ? { ...n, message, category } : n));
  };

  const deleteNotification = (id: string) => {
    setNotificationsSync(prev => prev.filter(n => n.id !== id));
  };

  // Management code workflow - management requests a new code be created.
  // This sends a confirmation email to the developer (storageeapp@gmail.com).
  // Management code workflow - management requests a new code be created.
  // This sends a confirmation email to the developer (storageeapp@gmail.com).
  const createOrgCodeRequest = async (data: { orgType: 'school' | 'institute'; instituteId?: string; managementEmail: string }) => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/org-code/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const json = await resp.json();
      if (json && json.success && json.token) {
        // Persisted on server
        const id = `req_${Date.now()}`;
        setPendingCodeRequestsSync(prev => [{ id, orgType: data.orgType, instituteId: data.instituteId, managementEmail: data.managementEmail, requestAt: new Date().toISOString(), status: 'pending', token: json.token }, ...prev]);
        // also notify developer (server may send email but keep local notification for dev UI)
        // synchronous notification write so popup effect can pick it up immediately
        const subject = `Confirm ${data.orgType} code request`;
        const body = `A request for a ${data.orgType} code has been made by ${data.managementEmail}.

      Approve it by visiting: ${window.location.origin}${window.location.pathname}#/confirm-code/${json.token}`;
        const noteId = addNotification('storageeapp@gmail.com', `Please confirm creation of ${data.instituteId || data.orgType} code for ${data.managementEmail}. Confirm by visiting: ${window.location.origin}${window.location.pathname}#/confirm-code/${json.token}`, undefined, { token: json.token }, 'message', undefined, undefined, subject, body);
        // keep notifications refs in sync
        setNotificationsSync(prev => prev);
        return { id, token: json.token };
      }
    } catch (e) {
      console.error('Failed to create org code request', e);
    }

    // Fallback: create request locally (no server). Generate a 10-character token and notify the developer
    const token = Math.random().toString(36).slice(2, 12).toUpperCase(); // 10 chars
    const id = `req_${Date.now()}`;
    const entry = { id, orgType: data.orgType, instituteId: data.instituteId, managementEmail: data.managementEmail, requestAt: new Date().toISOString(), status: 'pending' as const, token };
    setPendingCodeRequestsSync(prev => [entry, ...prev]);
    // send developer notification (local)
    const subject = `Confirm ${data.orgType} code request`;
    const body = `A request for a ${data.orgType} code has been made by ${data.managementEmail}.

  Approve it by visiting: ${window.location.origin}${window.location.pathname}#/confirm-code/${token}`;
    const noteId = addNotification('storageeapp@gmail.com', `Please confirm creation of ${data.instituteId || data.orgType} code for ${data.managementEmail}. Confirm by visiting: ${window.location.origin}${window.location.pathname}#/confirm-code/${token}`, id, { token }, 'message', undefined, undefined, subject, body);
    setNotificationsSync(prev => prev);
    return { id, token };
  };

  // Called by developer when they click confirm in the email. It will generate a
  // random management code, store it and notify the management email with the new code.
  // Called by developer when they click confirm in the email. It will generate a
  // random management code, store it and notify the management email with the new code.
  const confirmOrgCodeRequest = async (token: string): Promise<false | { success: true; code: string }> => {
    // First, try to resolve locally (fast path) if we have a matching pending entry
    const pendingLocal = pendingCodeRequestsRef.current.find(p => p.token === token) || pendingCodeRequests.find(p => p.token === token);
    if (pendingLocal) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const createdAt = new Date().toISOString();
      const newCode = { id: `code_${Date.now()}`, orgType: pendingLocal.orgType, instituteId: pendingLocal.instituteId, code, createdAt };
      setOrgCodes(prev => [newCode, ...prev]);
      setPendingCodeRequestsSync(prev => prev.filter(p => p.token !== token));
      // mark removed/confirmed in any local pending list
      try {
        addNotification(pendingLocal.managementEmail, `Your management code has been created.\n\nThanks For using EduNexus AI`, pendingLocal.id, { code }, 'message', undefined, undefined, 'Your management code is ready', `Your ${pendingLocal.orgType} code has been generated.\n\nPlease visit your dashboard to view the code securely.`);
        setNotificationsSync(prev => prev);
      } catch (err) {
        // ignore
      }
      return { success: true as const, code };
    }

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/org-code/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const json: any = await resp.json();
      if (json && json.success) {
        return { success: true as const, code: String(json.code || '') };
      }
    } catch (e) {
      console.error('Failed to confirm org code (server), falling back to local confirmation', e);
    }

    // Local fallback: confirm a pending request stored locally
    const pending = pendingCodeRequestsRef.current.find(p => p.token === token) || pendingCodeRequests.find(p => p.token === token);
    if (!pending) return false;

    // generate a final 6-character code
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const createdAt = new Date().toISOString();
    const newCode = { id: `code_${Date.now()}`, orgType: pending.orgType, instituteId: pending.instituteId, code, createdAt };
    setOrgCodes(prev => [newCode, ...prev]);
    // mark pending request as confirmed (remove from queue)
    setPendingCodeRequestsSync(prev => prev.filter(p => p.token !== token));
    // notify management with final code and thank-you message
    try {
      addNotification(pending.managementEmail, `Your management code has been created.\n\nThanks For using EduNexus AI`, pending.id, { code }, 'message', undefined, undefined, 'Your management code is ready', `Your ${pending.orgType} code has been generated.\n\nPlease visit your dashboard to view the code securely.`);
      setNotificationsSync(prev => prev);
    } catch (err) {
      // ignore
    }

    return { success: true as const, code };
  };

  // Developer can explicitly reject a pending code request (by token or id)
  const rejectOrgCodeRequest = (tokenOrId: string, reason?: string) => {
    // Try to notify the server first (best effort). If the server is down,
    // fall back to local state change so developer can still record the
    // rejection and the management user will see the message in their local
    // inbox.
    const pending = pendingCodeRequestsRef.current.find(p => p.token === tokenOrId || p.id === tokenOrId) || pendingCodeRequests.find(p => p.token === tokenOrId || p.id === tokenOrId);
    if (!pending) return false;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    (async () => {
      try {
        const resp = await fetch(`${apiUrl}/api/org-code/reject/${pending.token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason })
        });
        if (resp.ok) {
          // server handled reject — ensure local view updated too
          setPendingCodeRequestsSync(prev => prev.map(p => (p.token === tokenOrId || p.id === tokenOrId) ? { ...p, status: 'rejected', rejectionReason: reason || '' } : p));
          const subj = 'Organization Code Request Rejected';
          const body = `Sorry — your management code request for ${pending.instituteId || pending.orgType} was rejected by the developer.${reason ? '\n\nReason: ' + reason : ''}\n\nIf you need assistance, contact support.`;
          addNotification(pending.managementEmail, `Sorry — your management code request for ${pending.instituteId || pending.orgType} was rejected by the developer. ${reason ? '\nReason: ' + reason : ''}`, pending.id, { rejected: true, reason }, 'message', undefined, undefined, subj, body);
          setNotificationsSync(prev => prev);
          return;
        }
      } catch (err) {
        // network/server error — fall through to local-only update
        console.warn('server reject call failed', err);
      }

      // Local fallback (server not available)
      setPendingCodeRequestsSync(prev => prev.map(p => (p.token === tokenOrId || p.id === tokenOrId) ? { ...p, status: 'rejected', rejectionReason: reason || '' } : p));
      try {
        const subj = 'Organization Code Request Rejected';
        const body = `Sorry — your management code request for ${pending.instituteId || pending.orgType} was rejected by the developer.${reason ? '\n\nReason: ' + reason : ''}\n\nIf you need assistance, contact support.`;
        addNotification(pending.managementEmail, `Sorry — your management code request for ${pending.instituteId || pending.orgType} was rejected by the developer. ${reason ? '\nReason: ' + reason : ''}`, pending.id, { rejected: true, reason }, 'message', undefined, undefined, subj, body);
        setNotificationsSync(prev => prev);
      } catch (e) { /* best-effort only */ }
    })();

    return true;
  };

  const viewOrgCode = async (password: string, orgType: 'school' | 'institute') => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    try {
      const resp = await fetch(`${apiUrl}/api/org-code/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, orgType })
      });
      if (resp.status === 401) return { success: false, error: 'Invalid password' };
      const json = await resp.json();
      return json;
    } catch (e) {
      // network fallback: lookup local store for an existing code or pending request
      // If we have a confirmed local code, return that. If a pending request exists, indicate pending.
      try {
        const codeEntry = orgCodes.find(c => c.orgType === orgType);
        if (codeEntry) return { success: true, code: codeEntry.code };
        const pending = pendingCodeRequestsRef.current.find(p => p.orgType === orgType && p.status === 'pending') || pendingCodeRequests.find(p => p.orgType === orgType && p.status === 'pending');
        if (pending) return { success: false, error: 'Pending developer confirmation' };
        return { success: false, error: 'Network error' };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    }
  };

  const markNotificationRead = (id: string) => setNotificationsSync(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const getNotificationsForEmail = (email: string) => (notificationsRef.current || notifications).filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());

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
    const existing = pendingOrgRequestsRef.current.find(r => r.code.toUpperCase() === codeUpper && r.orgType === data.orgType) || pendingOrgRequests.find(r => r.code.toUpperCase() === codeUpper && r.orgType === data.orgType);
    if (existing) {
      // If the request is not pending, just report back its status
      if (existing.status !== 'pending') return { id: existing.id, attached: false, status: existing.status };
      // Attach applicant info if missing
      setPendingOrgRequestsSync(prev => prev.map(r => r.id === existing.id ? { ...r, name: r.name || data.name, email: r.email || data.email, role: r.role || data.role } : r));
      return { id: existing.id, attached: true, status: 'pending' as const };
    }

    // Create a new pending request using the provided code so management can
    // approve or reject it.
    const id = `orgreq${Date.now()}`;
    const timestamp = new Date().toISOString();
    const request = { id, code: codeUpper, timestamp, status: 'pending' as const, name: data.name, email: data.email, role: data.role, orgType: data.orgType, instituteId: data.instituteId };
    setPendingOrgRequestsSync(prev => [request, ...prev]);
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
    books,
    borrowRecords,
    bookRequests,
    departments,
    pendingDepartments,
    pendingClasses,
    addMessage,
    updateMessage,
    deleteUser,
    addTask,
    deleteTask,
    updateStudentTaskStatus,
    addUser,
    addBook,
    updateBook,
    deleteBook,
    borrowBook,
    returnBook,
    reservations,
    addReservation,
    cancelReservation,
    addBookRequest,
    updateBookRequestStatus,
    updateBookRequestPriority,
    fulfillRequestAndReserve,
    getTopBorrowedReport,
    exportBooksCSV,
    importBooksFromCSV,
    exportBooksXLSX,
    exportBooksPDF,
    exportBooksDOCX,
    bulkReserve,
    bulkFulfillRequests,
    bulkMarkLost,
    bulkMarkDamaged,
    bulkDeleteBooks,
    getPopularBooks,
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
    orgCodeAnalytics,
    createOrgCodeRequest,
    confirmOrgCodeRequest,
    rejectOrgCodeRequest,
    viewOrgCode,
    getOrgCodeAnalytics: () => orgCodeAnalytics,
    addNotification,
    pendingManagementSignups,
    addPendingManagementSignup,
    removePendingManagementSignup,
    markPendingSignupError,
    markPendingSignupSynced,
    retryPendingSignup,
    cancelPendingSignup,
    broadcastNotification,
    updateNotification,
    deleteNotification,
    markNotificationRead,
    getNotificationsForEmail,
    activateUser,
    deleteOrgRequest,
    auditLogs,
    damageReports,
    addAuditLog,
    reportDamage,
    resolveDamage,
    markBookLost,
    markBookDamaged,
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
  const { users = [], classes = [], messages = [], tasks = [], studentTasks = [], marks = [], attendance = [], departments = [], pendingDepartments = [], pendingClasses = [], pendingTeachers = [], pendingOrgRequests = [], notifications = [], orgCodes = [], pendingCodeRequests = [], pendingManagementSignups: persistedPendingSignups = [], books = [], borrowRecords = [], bookRequests = [], reservations = [], auditLogs = [], damageReports = [], orgCodeAnalytics: persistedOrgCodeAnalytics = null } = ctx as any;

  useEffect(() => {
    try {
      const toStore = JSON.stringify({ users, classes, messages, tasks, studentTasks, marks, attendance, departments, pendingDepartments, pendingClasses, pendingTeachers, pendingOrgRequests, notifications, orgCodes, pendingCodeRequests, pendingManagementSignups: persistedPendingSignups, books, borrowRecords, bookRequests, reservations, auditLogs, damageReports, orgCodeAnalytics: persistedOrgCodeAnalytics });
      localStorage.setItem('edunexus:data', toStore);
    } catch (err) {
      console.warn('Failed to persist data', err);
    }
  }, [users, classes, messages, tasks, studentTasks, marks, attendance, departments, pendingDepartments, pendingClasses, pendingTeachers, pendingOrgRequests, orgCodes, pendingCodeRequests, persistedPendingSignups, books, borrowRecords, bookRequests, reservations, auditLogs, damageReports, persistedOrgCodeAnalytics]);

  return null;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
