
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../Layout';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AttendanceBarChart from '../charts/AttendanceBarChart';
import SubjectPieChart from '../charts/SubjectPieChart';
import { generateStudySchedule } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../context/DataContext';
import { Mark, StudySession, StudentTask, Task } from '../../types';
import { ATTENDANCE_THRESHOLD } from '../../constants';
import Select from '../ui/Select';

// --- New Student Tasks View ---
const StudentTasksView: React.FC = () => {
    const { user } = useAuth();
    const { studentTasks, tasks, teachers, updateStudentTaskStatus } = useData();

    const myTasks = useMemo(() => {
        return studentTasks
            .filter(st => st.studentId === user?.id)
            .map(st => {
                const task = tasks.find(t => t.id === st.taskId);
                const creator = teachers.find(t => t.id === task?.creatorId);
                return { ...st, task, creatorName: creator?.name || 'Unknown Teacher' };
            })
            .filter(st => st.task); // Filter out any student tasks with no matching task
    }, [user, studentTasks, tasks, teachers]);

    const activeTasks = myTasks.filter(t => t.status !== 'Completed');
    const completedTasks = myTasks.filter(t => t.status === 'Completed');

    const priorityColor = {
        High: 'border-[rgb(var(--danger-color))]',
        Medium: 'border-[rgb(var(--warning-color))]',
        Low: 'border-[rgb(var(--success-color))]'
    };

    const TaskCard: React.FC<{ taskData: (typeof myTasks)[0] }> = ({ taskData }) => (
        <div className={`p-4 rounded-lg bg-[rgb(var(--foreground-color))] border-l-4 ${priorityColor[taskData.task!.priority]}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{taskData.task!.title}</h3>
                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">By {taskData.creatorName} | Due: {new Date(taskData.task!.dueDate).toLocaleDateString()}</p>
                </div>
                <select 
                    value={taskData.status} 
                    onChange={(e) => updateStudentTaskStatus(taskData.id, e.target.value as StudentTask['status'])}
                    className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] text-sm rounded-lg focus:ring-[rgb(var(--primary-color))] focus:border-[rgb(var(--primary-color))]"
                >
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                </select>
            </div>
            <p className="mt-2 text-[rgb(var(--text-color))]">{taskData.task!.description}</p>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-4">Active Tasks ({activeTasks.length})</h2>
                <div className="space-y-4">
                    {activeTasks.length > 0 ? (
                        activeTasks.map(st => <TaskCard key={st.id} taskData={st} />)
                    ) : (
                        <p>No active tasks. Great job!</p>
                    )}
                </div>
            </div>
             <div>
                <h2 className="text-2xl font-bold mb-4">Completed Tasks ({completedTasks.length})</h2>
                <div className="space-y-4">
                    {completedTasks.length > 0 ? (
                        completedTasks.map(st => <TaskCard key={st.id} taskData={st} />)
                    ) : (
                        <p>No tasks completed yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}


// --- Original Dashboard Components ---

const DashboardView: React.FC<{ studentMarks: Mark[], studentAttendance: any, onGenerateSchedule: () => void }> = ({ studentMarks, studentAttendance, onGenerateSchedule }) => {
    const { user } = useAuth();
    const overallAttendance = studentAttendance.total > 0 ? ((studentAttendance.present / studentAttendance.total) * 100).toFixed(1) : 0;
    const lowAttendanceSubjects = studentAttendance.subjectWise.filter((s:any) => s.attendance < ATTENDANCE_THRESHOLD);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <h2 className="text-xl font-bold mb-4">Welcome back, {user?.name}!</h2>
                <p className="text-[rgb(var(--text-secondary-color))]">Here's a quick summary of your academic progress.</p>
            </Card>
            <Card>
                <h3 className="font-bold text-lg mb-2">AI Study Planner</h3>
                <p className="text-sm text-[rgb(var(--text-secondary-color))] mb-4">Get a personalized study schedule for today based on your performance.</p>
                <Button onClick={onGenerateSchedule} className="w-full">Generate Today's Plan</Button>
            </Card>
             <Card>
                <h3 className="font-bold text-lg mb-2">Overall Attendance</h3>
                <p className={`text-4xl font-bold ${parseFloat(overallAttendance as string) < ATTENDANCE_THRESHOLD ? 'text-[rgb(var(--danger-color))]' : 'text-[rgb(var(--success-color))]'}`}>{overallAttendance}%</p>
                {lowAttendanceSubjects.length > 0 && 
                    <p className="text-sm text-[rgb(var(--warning-color))] mt-2">Attention needed in: {lowAttendanceSubjects.map((s:any) => s.name).join(', ')}</p>
                }
            </Card>
             <Card className="lg:col-span-2">
                <h3 className="font-bold text-lg mb-2">Recent Marks Overview</h3>
                 <div className="h-48 overflow-y-auto">
                    <ul className="space-y-2">
                    {studentMarks.map(m => (
                        <li key={m.subject} className="flex justify-between items-center p-2 rounded-lg bg-[rgb(var(--subtle-background-color))]">
                            <span className="font-medium">{m.subject}</span>
                            <span className={`font-bold ${m.marks/m.maxMarks*100 < 60 ? 'text-[rgb(var(--danger-color))]' : 'text-[rgb(var(--success-color))]'}`}>{m.marks}/{m.maxMarks}</span>
                        </li>
                    ))}
                    </ul>
                </div>
            </Card>
        </div>
    );
};

const AttendanceView: React.FC<{ studentAttendance: any }> = ({ studentAttendance }) => (
    <Card>
        <h2 className="text-xl font-bold mb-4">Attendance Details</h2>
        <AttendanceBarChart data={studentAttendance.subjectWise} />
    </Card>
);

const MarksView: React.FC<{ studentMarks: Mark[] }> = ({ studentMarks }) => {
    const pieChartData = studentMarks.map(m => ({ name: m.subject, value: m.marks }));
    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Marks Distribution</h2>
            <SubjectPieChart data={pieChartData} />
        </Card>
    );
};

const ScheduleView: React.FC<{ studentMarks: Mark[] }> = ({ studentMarks }) => {
    const [schedule, setSchedule] = useState<StudySession[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateSchedule = useCallback(async () => {
        setIsLoading(true);
        const availableSlots = ['09:00-12:00', '13:00-16:00', '19:00-21:00'];
        const result = await generateStudySchedule(studentMarks, availableSlots);
        setSchedule(result);
        setIsLoading(false);
    }, [studentMarks]);
    
    useEffect(() => {
        handleGenerateSchedule();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">AI Generated Study Schedule</h2>
                <Button onClick={handleGenerateSchedule} disabled={isLoading}>{isLoading ? 'Generating...' : 'Regenerate'}</Button>
            </div>
            {isLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[rgb(var(--primary-color))]"></div>
                 </div>
            ) : (
                <div className="space-y-4">
                    {schedule.map((session, index) => (
                        <div key={index} className="p-4 rounded-lg bg-[rgb(var(--subtle-background-color))] border-l-4 border-[rgb(var(--primary-color))]">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">{session.subject}</h3>
                                <span className="text-sm font-mono bg-[rgba(var(--primary-color),0.1)] text-[rgb(var(--primary-color))] px-2 py-1 rounded">{session.startTime} - {session.endTime}</span>
                            </div>
                            <p className="text-[rgb(var(--text-color))] mt-1">{session.topic}</p>
                            <p className="text-sm text-[rgb(var(--text-secondary-color))] mt-2"><em>Reason: {session.reason}</em></p>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};


// --- Main Dashboard Component ---

const Icon = ({ path }: { path: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);


const StudentDashboard: React.FC = () => {
  const [activeItem, setActiveItem] = useState('Dashboard');
  const { user } = useAuth();
  const { marks, attendance } = useData();

  // In a real app, this data would be fetched via API based on the user's ID
  const studentMarks = marks.filter(m => m.studentId === user?.id);
  const studentAttendanceRecords = attendance.filter(a => a.studentId === user?.id);

  // Process data for charts
  const studentAttendance = {
      total: studentAttendanceRecords.length,
      present: studentAttendanceRecords.filter(a => a.status === 'present').length,
      subjectWise: [ // This would be more complex in a real app
          { name: 'Data Structures', attendance: 80 },
          { name: 'Algorithms', attendance: 90 },
          { name: 'Database Systems', attendance: 70 },
      ]
  };
  
  const navItems = [
    { name: 'Dashboard', icon: <Icon path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1.5-1.5m1.5 1.5l1.5-1.5m0 0l1.5 1.5m-1.5-1.5l-1.5 1.5" /> },
    { name: 'Attendance', icon: <Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { name: 'Marks', icon: <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /> },
    { name: 'My Tasks', icon: <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { name: 'Schedule', icon: <Icon path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /> }
  ];

  const renderContent = () => {
    switch (activeItem) {
      case 'Dashboard':
        return <DashboardView studentMarks={studentMarks} studentAttendance={studentAttendance} onGenerateSchedule={() => setActiveItem('Schedule')} />;
      case 'Attendance':
        return <AttendanceView studentAttendance={studentAttendance} />;
      case 'Marks':
        return <MarksView studentMarks={studentMarks} />;
      case 'My Tasks':
        return <StudentTasksView />;
      case 'Schedule':
        return <ScheduleView studentMarks={studentMarks} />;
      default:
        return <DashboardView studentMarks={studentMarks} studentAttendance={studentAttendance} onGenerateSchedule={() => setActiveItem('Schedule')} />;
    }
  };

  return (
    <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem}>
      {renderContent()}
    </Layout>
  );
};

export default StudentDashboard;
