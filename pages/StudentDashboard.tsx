import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Mark, StudentTask, Task } from '../types';
import { ATTENDANCE_THRESHOLD } from '../constants';
import Select from '../components/ui/Select';
import ProfileView from '../components/shared/ProfileView';

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
    const lowAttendanceSubjects = studentAttendance.subjectWise.filter((s: any) => s.attendance < ATTENDANCE_THRESHOLD);

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
                    <p className="text-sm text-[rgb(var(--warning-color))] mt-2">Attention needed in: {lowAttendanceSubjects.map((s: any) => s.name).join(', ')}</p>
                }
            </Card>
            <Card className="lg:col-span-2">
                <h3 className="font-bold text-lg mb-2">Recent Marks Overview</h3>
                <div className="h-48 overflow-y-auto">
                    <ul className="space-y-2">
                        {studentMarks.map(m => (
                            <li key={m.subject} className="flex justify-between items-center p-2 rounded-lg bg-[rgb(var(--subtle-background-color))]">
                                <span className="font-medium">{m.subject}</span>
                                <span className={`font-bold ${m.marks / m.maxMarks * 100 < 60 ? 'text-[rgb(var(--danger-color))]' : 'text-[rgb(var(--success-color))]'}`}>{m.marks}/{m.maxMarks}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
        </div>
    );
};

const AttendanceView: React.FC = () => (
    <Card>
        <h2 className="text-xl font-bold mb-4">Attendance</h2>
        <p className="text-[rgb(var(--text-secondary-color))]">attendence isn't updated  , it will be updated shortly</p>
    </Card>
);

const MarksView: React.FC = () => (
    <Card>
        <h2 className="text-xl font-bold mb-4">Marks</h2>
        <p className="text-[rgb(var(--text-secondary-color))]">marks will not be displayed shortly</p>
    </Card>
);

const ScheduleView: React.FC<{ studentMarks: Mark[] }> = ({ studentMarks }) => {
    const [showPlanner, setShowPlanner] = useState(false);
    const [subjectInput, setSubjectInput] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [performanceMessage, setPerformanceMessage] = useState('');
    const messageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const addSubject = (subjectName: string) => {
        const trimmed = subjectName.trim();
        if (!trimmed) return;
        setSubjects(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    };

    const handleAddSubject = () => {
        addSubject(subjectInput);
        setSubjectInput('');
    };

    const removeSubject = (subjectName: string) => {
        setSubjects(prev => prev.filter(sub => sub !== subjectName));
    };

    const handleShowPerformance = () => {
        if (studentMarks.length === 0) {
            setPerformanceMessage('NO, data found');
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
            messageTimerRef.current = setTimeout(() => setPerformanceMessage(''), 5000);
            return;
        }
        const markSubjects = studentMarks.map(mark => mark.subject);
        const combined = Array.from(new Set([...subjects, ...markSubjects]));
        setSubjects(combined);
        setPerformanceMessage('');
    };

    React.useEffect(() => {
        return () => {
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        };
    }, []);

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold">AI Generated Study Schedule</h2>
                    <p className="text-[rgb(var(--text-secondary-color))]">
                        You can create a time table as per the aviable time with respect to you're acadamic performence , Also can create indivual time-time with aviable of time and required time.
                    </p>
                </div>
                <Button type="button" onClick={() => setShowPlanner(true)} className="w-full md:w-auto">
                    Create Timetable
                </Button>
                {showPlanner && (
                    <div className="space-y-4 border border-[rgb(var(--border-color))] rounded-lg p-4 bg-[rgb(var(--subtle-background-color))]">
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary-color))] mb-1">Available Time Slots</label>
                            <input type="text" placeholder="e.g., 4 hours per day or 6-9 PM daily" className="w-full p-2 rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--foreground-color))]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary-color))] mb-1">Add Subjects</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col md:flex-row gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type a subject and click Add Subject"
                                        className="flex-1 p-2 rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--foreground-color))]"
                                        value={subjectInput}
                                        onChange={(e) => setSubjectInput(e.target.value)}
                                    />
                                    <Button type="button" onClick={handleAddSubject} className="md:w-auto w-full">
                                        Add Subject
                                    </Button>
                                </div>
                                {subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map(sub => (
                                            <span key={sub} className="px-2 py-1 text-sm rounded-full bg-[rgba(var(--primary-color),0.1)] text-[rgb(var(--primary-color))]">
                                                {sub}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={handleShowPerformance}
                                className="text-sm font-semibold text-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-color-dark))]"
                            >
                                Academic Performance
                            </button>
                            {performanceMessage && (
                                <p className="mt-2 text-sm text-[rgb(var(--danger-color))]">{performanceMessage}</p>
                            )}
                        </div>
                        {subjects.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {subjects.map(sub => (
                                    <div key={sub} className="relative px-4 py-2 rounded-full bg-[rgba(var(--primary-color),0.1)] text-sm text-[rgb(var(--primary-color))]">
                                        <span className="pr-4">{sub}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSubject(sub)}
                                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[rgb(var(--primary-color))] text-[rgb(var(--primary-text-color))] text-xs flex items-center justify-center hover:bg-[rgb(var(--primary-color-dark))]"
                                            aria-label={`Remove ${sub}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button type="button" className="w-full md:w-auto">
                            Generate Plan
                        </Button>
                    </div>
                )}
            </div>
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
        { name: 'Schedule', icon: <Icon path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /> },
        { name: 'Profile', icon: <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a8.25 8.25 0 0115 0" /> }
    ];

    const renderContent = () => {
        switch (activeItem) {
            case 'Dashboard':
                return <DashboardView studentMarks={studentMarks} studentAttendance={studentAttendance} onGenerateSchedule={() => setActiveItem('Schedule')} />;
            case 'Attendance':
                return <AttendanceView />;
            case 'Marks':
                return <MarksView />;
            case 'My Tasks':
                return <StudentTasksView />;
            case 'Schedule':
                return <ScheduleView studentMarks={studentMarks} />;
            case 'Profile':
                return <ProfileView />;
            default:
                return <DashboardView studentMarks={studentMarks} studentAttendance={studentAttendance} onGenerateSchedule={() => setActiveItem('Schedule')} />;
        }
    };

    return (
        <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem} profileNavItemName="Profile">
            {renderContent()}
        </Layout>
    );
};

export default StudentDashboard;
