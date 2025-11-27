
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
// FIX: Import Mark and AttendanceRecord types to use in the context.
import { LoggedInUser, Class, Message, Teacher, Student, Parent, Dean, UserRole, Task, StudentTask, Mark, AttendanceRecord } from '../types';

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
    // FIX: Provide marks and attendance in the context value object.
    marks,
    attendance,
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
  const { users, classes, messages, tasks, studentTasks, marks, attendance } = React.useContext(DataContext) as DataContextType;

  useEffect(() => {
    try {
      const toStore = JSON.stringify({ users, classes, messages, tasks, studentTasks, marks, attendance });
      localStorage.setItem('edunexus:data', toStore);
    } catch (err) {
      console.warn('Failed to persist data', err);
    }
  }, [users, classes, messages, tasks, studentTasks, marks, attendance]);

  return null;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
