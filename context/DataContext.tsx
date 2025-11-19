
import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
// FIX: Import Mark and AttendanceRecord types to use in the context.
import { LoggedInUser, Class, Message, Teacher, Student, Parent, Dean, UserRole, Task, StudentTask, Mark, AttendanceRecord } from '../types';
// FIX: Import mockMarks and mockAttendance to provide them through the context.
import { mockUsers, mockClasses, mockMessages as initialMockMessages, mockTasks as initialMockTasks, mockStudentTasks as initialMockStudentTasks, mockMarks, mockAttendance } from '../data/mock';

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<LoggedInUser[]>(mockUsers);
  const [classes, setClasses] = useState<Class[]>(mockClasses);
  const [messages, setMessages] = useState<Message[]>(initialMockMessages);
  const [tasks, setTasks] = useState<Task[]>(initialMockTasks);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>(initialMockStudentTasks);
  // FIX: Create state for marks and attendance using mock data.
  const [marks, setMarks] = useState<Mark[]>(mockMarks);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance);


  const addMessage = (message: Omit<Message, 'id' | 'timestamp' | 'readBy'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg${Date.now()}`,
      timestamp: new Date().toISOString(),
      readBy: [message.senderId],
    };
    setMessages(prev => [newMessage, ...prev]);
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
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
