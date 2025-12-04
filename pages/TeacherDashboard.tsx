import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { UserRole, Class, Task, StudentTask, TeacherExtended } from '../types';
import { TEACHER_TITLES, TEACHER_TITLE_RANK } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import MessagesView from '../components/shared/MessagesView';
import ProfileView from '../components/shared/ProfileView';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

// --- Task Management Components ---

const TaskFormModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    teacherClasses: Class[],
    taskToEdit?: Task | null
}> = ({ isOpen, onClose, teacherClasses, taskToEdit }) => {
    const { user } = useAuth();
    const { students, addTask } = useData();
    const [classId, setClassId] = useState(taskToEdit?.classId || '');
    const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
    const [title, setTitle] = useState(taskToEdit?.title || '');
    const [description, setDescription] = useState(taskToEdit?.description || '');
    const [dueDate, setDueDate] = useState(taskToEdit?.dueDate ? new Date(taskToEdit.dueDate).toISOString().substring(0, 10) : '');
    const [priority, setPriority] = useState<Task['priority']>(taskToEdit?.priority || 'Medium');

    const studentsInClass = useMemo(() => students.filter(s => s.classId === classId), [classId, students]);

    const handleStudentCheck = (studentId: string) => {
        setAssignedStudents(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSelectAll = () => {
        setAssignedStudents(studentsInClass.map(s => s.id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !classId || assignedStudents.length === 0) return;

        // In a real app, you would handle editing differently
        if (taskToEdit) {
            console.log("Editing task", taskToEdit.id); // Placeholder
        } else {
            addTask({
                title,
                description,
                classId,
                creatorId: user.id,
                dueDate: new Date(dueDate).toISOString(),
                priority
            }, assignedStudents);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold">{taskToEdit ? "Edit Task" : "Create New Task"}</h3>
                <Input id="title" label="Task Title" value={title} onChange={e => setTitle(e.target.value)} required />
                <div>
                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-[rgb(var(--text-color))]">Description</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] caret-[rgb(var(--text-color))] sm:text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-2.5" />
                </div>
                <Select id="class" label="Assign to Class" value={classId} onChange={e => setClassId(e.target.value)} required>
                    <option value="">-- Select a Class --</option>
                    {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {classId && (
                    <div>
                        <label className="block mb-2 text-sm font-medium">Assign to Students</label>
                        <div className="max-h-40 overflow-y-auto border border-[rgb(var(--border-color))] rounded-lg p-2 space-y-1">
                            <Button type="button" size="sm" variant="secondary" onClick={handleSelectAll}>Select All</Button>
                            {studentsInClass.map(s => (
                                <div key={s.id} className="flex items-center">
                                    <input type="checkbox" id={`student-${s.id}`} checked={assignedStudents.includes(s.id)} onChange={() => handleStudentCheck(s.id)} className="w-4 h-4 text-[rgb(var(--primary-color))] bg-[rgb(var(--subtle-background-color))] border-[rgb(var(--border-color))] rounded focus:ring-[rgb(var(--primary-color))]" />
                                    <label htmlFor={`student-${s.id}`} className="ml-2 text-sm font-medium">{s.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <Input id="dueDate" label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                <Select id="priority" label="Priority" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </Select>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">{taskToEdit ? "Save Changes" : "Create Task"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const TaskDetailView: React.FC<{ task: Task, onBack: () => void }> = ({ task, onBack }) => {
    const { studentTasks, students, classes } = useData();
    const relevantStudentTasks = studentTasks.filter(st => st.taskId === task.id);
    const className = classes.find(c => c.id === task.classId)?.name || 'Unknown Class';

    const studentsWithStatus = relevantStudentTasks.map(st => {
        const student = students.find(s => s.id === st.studentId);
        return {
            ...st,
            studentName: student?.name || 'Unknown Student'
        }
    });

    const completionPercent = relevantStudentTasks.length > 0 ? (relevantStudentTasks.filter(st => st.status === 'Completed').length / relevantStudentTasks.length) * 100 : 0;

    const priorityColor = {
        High: 'bg-[rgb(var(--danger-color))]',
        Medium: 'bg-[rgb(var(--warning-color))]',
        Low: 'bg-[rgb(var(--success-color))]'
    };

    return (
        <Card>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold">{task.title}</h2>
                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">For {className} | Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
                <Button onClick={onBack} variant="secondary">Back to List</Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold text-[rgb(var(--primary-text-color))] rounded-full ${priorityColor[task.priority]}`}>{task.priority}</span>
            </div>
            <p className="mt-4 text-[rgb(var(--text-color))]">{task.description}</p>

            <div className="mt-6">
                <h3 className="font-bold text-lg mb-2">Completion Progress</h3>
                <div className="w-full bg-[rgb(var(--subtle-background-color))] rounded-full">
                    <div className="bg-[rgb(var(--primary-color))] text-xs font-medium text-[rgb(var(--primary-text-color))] text-center p-0.5 leading-none rounded-full" style={{ width: `${completionPercent}%` }}>
                        {completionPercent.toFixed(0)}%
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <h3 className="font-bold text-lg mb-2">Student Status</h3>
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {studentsWithStatus.map(st => (
                        <li key={st.id} className="flex justify-between items-center p-2 bg-[rgb(var(--subtle-background-color))] rounded-lg">
                            <span>{st.studentName}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${st.status === 'Completed' ? 'bg-[rgb(var(--success-subtle-color))] text-[rgb(var(--success-text-color))]' : 'bg-[rgb(var(--warning-subtle-color))] text-[rgb(var(--warning-text-color))]'}`}>{st.status}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}

const TeacherTaskPage: React.FC<{ teacherClasses: Class[] }> = ({ teacherClasses }) => {
    const { user } = useAuth();
    const { tasks, studentTasks, deleteTask } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [view, setView] = useState<{ type: 'list' | 'detail', taskId?: string }>({ type: 'list' });

    const teacherTasks = tasks.filter(t => t.creatorId === user?.id);

    const handleViewDetails = (taskId: string) => {
        setView({ type: 'detail', taskId });
    };

    if (view.type === 'detail' && view.taskId) {
        const selectedTask = tasks.find(t => t.id === view.taskId);
        return selectedTask ? <TaskDetailView task={selectedTask} onBack={() => setView({ type: 'list' })} /> : <div>Task not found</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Task Management</h2>
                <Button onClick={() => setModalOpen(true)}>Create New Task</Button>
            </div>
            <Card>
                <div className="space-y-4">
                    {teacherTasks.length > 0 ? teacherTasks.map(task => {
                        const assignedCount = studentTasks.filter(st => st.taskId === task.id).length;
                        const completedCount = studentTasks.filter(st => st.taskId === task.id && st.status === 'Completed').length;
                        return (
                            <div key={task.id} className="p-4 rounded-lg bg-[rgb(var(--subtle-background-color))] flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold">{task.title}</h4>
                                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">Due: {new Date(task.dueDate).toLocaleDateString()} | {completedCount}/{assignedCount} Completed</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => handleViewDetails(task.id)} size="sm" variant="secondary">View</Button>
                                    <Button onClick={() => deleteTask(task.id)} size="sm" variant="danger">Delete</Button>
                                </div>
                            </div>
                        )
                    }) : <p>No tasks created yet. Click "Create New Task" to get started.</p>}
                </div>
            </Card>
            <TaskFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} teacherClasses={teacherClasses} />
        </div>
    );
};


// --- Original Dashboard Components ---

const AttendanceManager: React.FC<{ classId: string, onBack: () => void }> = ({ classId, onBack }) => {
    const { students } = useData();
    const classStudents = students.filter(s => s.classId === classId);
    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Manage Attendance for Class {classId}</h3>
            <ul>{classStudents.map(s => <li key={s.id}>{s.name} - <button className="text-[rgb(var(--danger-color))] text-sm">Delete Last Record</button></li>)}</ul>
            <Button onClick={onBack} variant="secondary" className="mt-4">Back to Class</Button>
        </Card>
    );
};
const MarksManager: React.FC<{ classId: string, onBack: () => void }> = ({ classId, onBack }) => (
    <Card>
        <h3 className="text-xl font-bold mb-4">Manage Marks for Class {classId}</h3>
        <Button onClick={onBack} variant="secondary" className="mt-4">Back to Class</Button>
    </Card>
);
const DocumentUploader: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files ? Array.from(e.target.files) : [];
        if (picked.length) setFiles(prev => [...prev, ...picked]);
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Upload General Document (PDF)</h3>
            <div className="border-2 border-dashed border-[rgb(var(--border-color))] rounded-lg p-8 text-center text-[rgb(var(--text-secondary-color))] cursor-pointer" onClick={() => inputRef.current?.click()}>
                <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onPick} />
                <p>Drag & Drop your PDF here — or click to select</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => <div key={i} className="px-2 py-1 bg-[rgb(var(--subtle-background-color))] rounded">{f.name}</div>)}
                    {files.length === 0 && <div className="text-sm text-[rgb(var(--text-secondary-color))]">No files selected</div>}
                </div>
                <div className="flex gap-2">
                    <button type="button" className="px-3 py-1 rounded border" onClick={() => inputRef.current?.click()}>Add more</button>
                </div>
            </div>
        </Card>
    );
};
const ModelPaperUploader: React.FC = () => (
    <Card>
        <h3 className="text-xl font-bold mb-4">Upload Model Paper</h3>
        <form className="space-y-4">
            <Input id="subject" label="Subject Name" />
            <Input id="exam" label="Exam Name (e.g., Midterm 1)" />
            <Input id="year" label="Year" type="number" />
            <Input id="file" type="file" />
            <Button>Upload Model Paper</Button>
        </form>
    </Card>
);
const DepartmentManager: React.FC = () => {
    const { teachers, deleteUser, setUserTitle, updateTeacherSubjects } = useData();
    const { user } = useAuth();
    const currentTitle = (user as any)?.title || '';
    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Manage Department Teachers</h3>
            <ul className="space-y-2">
                {teachers.map(t => (
                    <li key={t.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-2 bg-[rgb(var(--subtle-background-color))] rounded">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <span className="font-semibold">{t.name}</span>
                            <span className="text-sm text-[rgb(var(--text-secondary-color))]">- {t.department}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                            <label className="text-sm mr-2">Title</label>
                            {(() => {
                                const currentRank = TEACHER_TITLE_RANK[currentTitle] || 0;
                                const targetRank = TEACHER_TITLE_RANK[(t as any).title || 'subject-teacher'] || 0;
                                const canEdit = currentRank > targetRank;
                                return (
                                    <select value={(t as any).title || 'subject-teacher'} onChange={(e) => canEdit && setUserTitle(t.id, e.target.value)} disabled={!canEdit} className="p-1 border rounded">
                                        {TEACHER_TITLES.map(tt => (
                                            <option key={tt.id} value={tt.id}>{tt.name}</option>
                                        ))}
                                    </select>
                                );
                            })()}

                            <Button onClick={() => deleteUser(t.id)} variant="danger" size="sm">Delete</Button>
                        </div>
                        {(t as any).subjects && (t as any).subjects.length > 0 && (
                            <div className="w-full mt-2 md:mt-0 md:w-auto text-sm text-[rgb(var(--text-secondary-color))]">Subjects: {(t as any).subjects.join(', ')}</div>
                        )}
                    </li>
                ))}
            </ul>
            <Button className="mt-4">Add Teacher to Department</Button>
        </Card>
    );
};

const AddStudentForm: React.FC<{ classId: string, onClose: () => void }> = ({ classId, onClose }) => {
    // In a real app, this would call a context function to add the student
    return (
        <form className="space-y-4">
            <h3 className="text-lg font-bold">Add Student to Class {classId}</h3>
            <Input id="name" label="Student Name" required />
            <Input id="email" label="Student Email" type="email" required />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">Add Student</Button>
            </div>
        </form>
    )
}

const ClassView: React.FC<{ classObj: Class, setView: (view: string) => void }> = ({ classObj, setView }) => {
    const { students } = useData();
    const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
    const classStudents = students.filter(s => classObj.studentIds.includes(s.id));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Class: {classObj.name}</h2>
                <Button onClick={() => setAddStudentModalOpen(true)}>Add Student</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Button onClick={() => setView('attendance')} className="p-6 text-left">Manage Attendance</Button>
                <Button onClick={() => setView('marks')} className="p-6 text-left">Manage Marks</Button>
            </div>
            <Card>
                <h3 className="text-xl font-bold mb-4">Students ({classStudents.length})</h3>
                <ul className="space-y-2">
                    {classStudents.map(s => <li key={s.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded">{s.name}</li>)}
                </ul>
            </Card>
            <Modal isOpen={isAddStudentModalOpen} onClose={() => setAddStudentModalOpen(false)}>
                <AddStudentForm classId={classObj.id} onClose={() => setAddStudentModalOpen(false)} />
            </Modal>
        </div>
    );
};


// --- Main Component ---

const Icon = ({ path }: { path: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const TeacherDashboard: React.FC = () => {
    const [activeItem, setActiveItem] = useState('Dashboard');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState('dashboard'); // dashboard, class, attendance, marks
    const [showMessages, setShowMessages] = useState(false);

    const { user } = useAuth();
    const { classes, users, updateTeacherSubjects, departments } = useData();

    const me = users.find(u => u.id === user?.id) as (TeacherExtended | undefined);
    const mySubjects = me?.subjects || [];
    const [manageNewSubject, setManageNewSubject] = useState('');

    const teacherClasses = useMemo(() => {
        // Identify the teacher's institute id (when available) so we only
        // surface classes that belong to the teacher's institute
        const myInstituteId = (user as any)?.instituteId || null;
        return classes.filter(c => {
            // ensure teacher is assigned
            if (!c.teacherIds.includes(user!.id)) return false;
            // if a department exists for the class, ensure its instituteId matches
            const dept = departments.find(d => d.id === c.departmentId);
            if (dept && myInstituteId) return dept.instituteId === myInstituteId;
            // fallback: include class when department not found or no institute scoping
            return true;
        });
    }, [classes, user, departments]);

    const selectedClass = useMemo(() =>
        selectedClassId ? classes.find(c => c.id === selectedClassId) : null,
        [selectedClassId, classes]
    );

    const handleSelectClass = (classId: string) => {
        setSelectedClassId(classId);
        setCurrentView('class');
    };

    const resetToDashboard = () => {
        setSelectedClassId(null);
        setCurrentView('dashboard');
    }

    const navItems = [
        { name: 'Dashboard', icon: <Icon path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1.5-1.5m1.5 1.5l1.5-1.5m0 0l1.5 1.5m-1.5-1.5l-1.5 1.5" /> },
        { name: 'Upload PDF', icon: <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /> },
        { name: 'Upload Model Paper', icon: <Icon path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /> },
        { name: 'Announcements', icon: <Icon path="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 01-4.5-4.5V7.5a4.5 4.5 0 014.5-4.5h7.5a4.5 4.5 0 014.5 4.5v3.84" /> },
        { name: 'Profile', icon: <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a8.25 8.25 0 0115 0" /> }
    ];

    if (user?.role === UserRole.Dean) {
        navItems.splice(1, 0, { name: 'Department Mgmt', icon: <Icon path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.512 2.72a3 3 0 01-4.682-2.72 9.094 9.094 0 013.741-.479m-4.26 9.574a4.5 4.5 0 01-.223-1.99a4.5 4.5 0 01.223-1.99m13.486 0a4.5 4.5 0 00-.223-1.99a4.5 4.5 0 00.223-1.99m-13.486 0a4.5 4.5 0 00.223 1.99" /> },
            { name: 'Task Management', icon: <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> });
    } else {
        navItems.splice(1, 0, { name: 'Task Management', icon: <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> });
    }

    const breadcrumbs = [
        { name: 'Dashboard', action: resetToDashboard },
        ...(selectedClassId ? [{ name: selectedClass?.name || 'Class', action: () => setCurrentView('class') }] : []),
        ...(currentView === 'attendance' ? [{ name: 'Attendance' }] : []),
        ...(currentView === 'marks' ? [{ name: 'Marks' }] : []),
    ];

    const renderContent = () => {
        if (showMessages) {
            return <MessagesView />;
        }

        switch (activeItem) {
            case 'Dashboard':
                if (currentView === 'class' && selectedClass) return <ClassView classObj={selectedClass} setView={setCurrentView} />;
                if (currentView === 'attendance' && selectedClassId) return <AttendanceManager classId={selectedClassId} onBack={() => setCurrentView('class')} />;
                if (currentView === 'marks' && selectedClassId) return <MarksManager classId={selectedClassId} onBack={() => setCurrentView('class')} />;

                // Default Dashboard View
                return (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Your Classes</h2>
                        {user?.role === UserRole.Teacher && (
                            <Card className="mt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold">My Subjects</h3>
                                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">Manage the subjects you handle</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input id="manage-subject" label="Add subject" value={manageNewSubject} onChange={e => setManageNewSubject(e.target.value)} />
                                        <Button onClick={() => {
                                            if (manageNewSubject.trim()) {
                                                updateTeacherSubjects(user!.id, [...mySubjects, manageNewSubject.trim()]);
                                                setManageNewSubject('');
                                            }
                                        }}>Add</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {mySubjects.length ? mySubjects.map(s => (
                                            <div key={s} className="px-2 py-1 bg-[rgb(var(--subtle-background-color))] rounded-full flex items-center gap-2">
                                                <span className="text-sm">{s}</span>
                                                <button type="button" onClick={() => updateTeacherSubjects(user!.id, mySubjects.filter(x => x !== s))} className="text-xs font-bold text-red-500">×</button>
                                            </div>
                                        )) : <div className="text-sm text-[rgb(var(--text-secondary-color))]">No subjects assigned yet.</div>}
                                    </div>
                                </div>
                            </Card>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teacherClasses.map(c => (
                                <Card key={c.id} className="hover:shadow-lg transition-shadow">
                                    <h3 className="font-bold text-xl">{c.name}</h3>
                                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">{c.studentIds.length} Students</p>
                                    <Button onClick={() => handleSelectClass(c.id)} className="mt-4 w-full">Manage Class</Button>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'Department Mgmt':
                return <DepartmentManager />;
            case 'Task Management':
                return <TeacherTaskPage teacherClasses={teacherClasses} />;
            case 'Upload PDF':
                return <DocumentUploader />;
            case 'Upload Model Paper':
                return <ModelPaperUploader />;
            case 'Announcements':
                return <div>Announcements Coming Soon</div>;
            case 'Profile':
                return <ProfileView />;
            default:
                return <div>Select an item from the sidebar</div>;
        }
    };

    return (
        <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem} setShowMessages={setShowMessages} profileNavItemName="Profile">
            <div className="mb-4">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        {breadcrumbs.map((crumb, index) => (
                            <li key={crumb.name} className="inline-flex items-center">
                                {index > 0 && <svg className="w-6 h-6 text-[rgb(var(--text-secondary-color))]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>}
                                <button onClick={crumb.action} disabled={!crumb.action} className={`text-sm font-medium ${index === breadcrumbs.length - 1 ? 'text-[rgb(var(--text-secondary-color))]' : 'text-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-color-dark))]'}`}>
                                    {crumb.name}
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>
            {renderContent()}
        </Layout>
    );
};

export default TeacherDashboard;
