import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { UserRole, TeacherExtended, TeacherTitle } from '../types';

const ManagementDashboard: React.FC = () => {
    const { user, logout, signUp } = useAuth();
    const {
        departments, addDepartment, deleteDepartment,
        classes, addClass, deleteClass,
        teachers, assignHOD, assignClassTeacher,
        students, parents
    } = useData();

    const [activeTab, setActiveTab] = useState<'departments' | 'classes' | 'teachers' | 'hods' | 'advisors' | 'analytics'>('departments');

    // Form States
    const [newDeptName, setNewDeptName] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');

    // Teacher Add State
    const [teacherName, setTeacherName] = useState('');
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');
    const [teacherRole, setTeacherRole] = useState('');
    const [teacherDept, setTeacherDept] = useState('');
    const [teacherUniqueId, setTeacherUniqueId] = useState('');

    const [selectedHodDept, setSelectedHodDept] = useState('');
    const [selectedHodTeacher, setSelectedHodTeacher] = useState('');

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedAdvisorTeacher, setSelectedAdvisorTeacher] = useState('');

    // Confirmation State
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationType, setConfirmationType] = useState<'addDepartment' | 'addClass' | 'addTeacher' | 'assignHOD' | 'assignAdvisor' | null>(null);
    const [pendingData, setPendingData] = useState<any>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const initiateAction = (type: typeof confirmationType, data: any) => {
        setPendingData(data);
        setConfirmationType(type);
        setShowConfirmation(true);
    };

    const handleConfirm = () => {
        if (!pendingData) return;

        switch (confirmationType) {
            case 'addDepartment':
                addDepartment(pendingData);
                setNewDeptName('');
                setSuccessMessage('Department Created Successfully');
                break;
            case 'addClass':
                addClass(pendingData);
                setNewClassName('');
                setSuccessMessage('Class Created Successfully');
                break;
            case 'addTeacher':
                signUp(pendingData.name, pendingData.email, pendingData.password, UserRole.Teacher, pendingData.extras);
                setTeacherName('');
                setTeacherEmail('');
                setTeacherPassword('');
                setTeacherRole('');
                setTeacherDept('');
                setTeacherUniqueId('');
                setSuccessMessage('Teacher Created Successfully');
                break;
            case 'assignHOD':
                assignHOD(pendingData.teacherId, pendingData.deptId);
                setSelectedHodDept('');
                setSelectedHodTeacher('');
                setSuccessMessage('HOD Assigned Successfully');
                break;
            case 'assignAdvisor':
                assignClassTeacher(pendingData.teacherId, pendingData.classId);
                setSelectedClassId('');
                setSelectedAdvisorTeacher('');
                setSuccessMessage('Class Advisor Assigned Successfully');
                break;
        }
        setShowConfirmation(false);
        setPendingData(null);
        setConfirmationType(null);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleDiscard = () => {
        setShowConfirmation(false);
        setPendingData(null);
        setConfirmationType(null);
    };

    // Handlers (Now just initiate action)
    const handleAddDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDeptName.trim()) {
            initiateAction('addDepartment', { name: newDeptName, instituteId: 'inst1' });
        }
    };

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (newClassName.trim() && selectedDeptId) {
            initiateAction('addClass', {
                name: newClassName,
                teacherIds: [],
                studentIds: []
            });
        }
    };

    const handleAddTeacher = (e: React.FormEvent) => {
        e.preventDefault();
        if (teacherName && teacherEmail && teacherPassword && teacherRole && teacherUniqueId) {
            const extras: any = {
                title: teacherRole,
                uniqueId: teacherUniqueId,
                instituteName: 'My Institute',
                teacherType: 'college'
            };
            if (teacherDept) extras.department = teacherDept;

            initiateAction('addTeacher', {
                name: teacherName,
                email: teacherEmail,
                password: teacherPassword,
                extras
            });
        }
    };

    const handleAssignHOD = () => {
        if (selectedHodDept && selectedHodTeacher) {
            initiateAction('assignHOD', { teacherId: selectedHodTeacher, deptId: selectedHodDept });
        }
    };

    const handleAssignAdvisor = () => {
        if (selectedClassId && selectedAdvisorTeacher) {
            initiateAction('assignAdvisor', { teacherId: selectedAdvisorTeacher, classId: selectedClassId });
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'departments':
                return (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4">Add New Department</h3>
                            <form onSubmit={handleAddDepartment} className="flex gap-4">
                                <Input
                                    id="deptName"
                                    label=""
                                    placeholder="Department Name (e.g. CSE)"
                                    value={newDeptName}
                                    onChange={e => setNewDeptName(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit">Add Department</Button>
                            </form>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {departments.map(dept => (
                                <Card key={dept.id} className="p-4 flex justify-between items-center">
                                    <span className="font-bold">{dept.name}</span>
                                    <button onClick={() => deleteDepartment(dept.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                </Card>
                            ))}
                            {departments.length === 0 && <p className="text-gray-500 col-span-full">No departments found.</p>}
                        </div>
                    </div>
                );
            case 'classes':
                return (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4">Add New Class</h3>
                            <form onSubmit={handleAddClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Department</label>
                                    <select
                                        className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                        value={selectedDeptId}
                                        onChange={e => setSelectedDeptId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <Input
                                        id="className"
                                        label=""
                                        placeholder="Class Name (e.g. CSE 2A)"
                                        value={newClassName}
                                        onChange={e => setNewClassName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit">Add Class</Button>
                                </div>
                            </form>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classes.map(cls => (
                                <Card key={cls.id} className="p-4 flex justify-between items-center">
                                    <span className="font-bold">{cls.name}</span>
                                    <button onClick={() => deleteClass(cls.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                </Card>
                            ))}
                            {classes.length === 0 && <p className="text-gray-500 col-span-full">No classes found.</p>}
                        </div>
                    </div>
                );
            case 'teachers':
                return (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4">Add New Teacher</h3>
                            <form onSubmit={handleAddTeacher} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input id="tName" label="Full Name" value={teacherName} onChange={e => setTeacherName(e.target.value)} required />
                                    <Input id="tUniqueId" label="Unique ID" value={teacherUniqueId} onChange={e => setTeacherUniqueId(e.target.value)} required />
                                    <Input id="tEmail" label="Email" type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} required />
                                    <Input id="tPass" label="Password" type="password" value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Role</label>
                                        <select
                                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                            value={teacherRole}
                                            onChange={e => setTeacherRole(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Role</option>
                                            {Object.values(TeacherTitle).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Department</label>
                                        <select
                                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                            value={teacherDept}
                                            onChange={e => setTeacherDept(e.target.value)}
                                        >
                                            <option value="">Select Department (Optional)</option>
                                            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <Button type="submit">Add Teacher</Button>
                            </form>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">Existing Teachers</h3>
                            {teachers.map(t => (
                                <Card key={t.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{t.name}</p>
                                        <p className="text-sm text-gray-500">{(t as TeacherExtended).title || 'Teacher'} - {t.email}</p>
                                    </div>
                                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{(t as TeacherExtended).department || 'No Dept'}</span>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'hods':
                return (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4">Assign HOD</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Department</label>
                                    <select
                                        className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                        value={selectedHodDept}
                                        onChange={e => setSelectedHodDept(e.target.value)}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Teacher</label>
                                    <select
                                        className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                        value={selectedHodTeacher}
                                        onChange={e => setSelectedHodTeacher(e.target.value)}
                                    >
                                        <option value="">-- Select Teacher --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                                    </select>
                                </div>
                                <Button onClick={handleAssignHOD} disabled={!selectedHodDept || !selectedHodTeacher}>Assign HOD</Button>
                            </div>
                        </Card>
                    </div>
                );
            case 'advisors':
                return (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4">Assign Class Advisor</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Class</label>
                                    <select
                                        className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                        value={selectedClassId}
                                        onChange={e => setSelectedClassId(e.target.value)}
                                    >
                                        <option value="">-- Select Class --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Teacher</label>
                                    <select
                                        className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                        value={selectedAdvisorTeacher}
                                        onChange={e => setSelectedAdvisorTeacher(e.target.value)}
                                    >
                                        <option value="">-- Select Teacher --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                                    </select>
                                </div>
                                <Button onClick={handleAssignAdvisor} disabled={!selectedClassId || !selectedAdvisorTeacher}>Assign Advisor</Button>
                            </div>
                        </Card>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold mb-4">Institute Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Total Students</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{students.length}</p>
                            </Card>
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Total Teachers</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{teachers.length}</p>
                            </Card>
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Total Classes</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{classes.length}</p>
                            </Card>
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Departments</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{departments.length}</p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="p-6">
                                <h4 className="text-lg font-bold mb-4">Department Distribution</h4>
                                <div className="space-y-2">
                                    {departments.map(d => {
                                        const count = teachers.filter(t => (t as TeacherExtended).department === d.name).length;
                                        return (
                                            <div key={d.id} className="flex justify-between items-center">
                                                <span>{d.name}</span>
                                                <span className="font-bold">{count} Teachers</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                            <Card className="p-6">
                                <h4 className="text-lg font-bold mb-4">Class Sizes</h4>
                                <div className="space-y-2">
                                    {classes.map(c => (
                                        <div key={c.id} className="flex justify-between items-center">
                                            <span>{c.name}</span>
                                            <span className="font-bold">{c.studentIds.length} Students</span>
                                        </div>
                                    ))}
                                    {classes.length === 0 && <p className="text-gray-500">No classes found.</p>}
                                </div>
                            </Card>
                        </div>
                    </div>
                );
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--background-color))] p-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[rgb(var(--text-color))]">Management Dashboard</h1>
                    <p className="text-[rgb(var(--text-secondary-color))]">Welcome, {user?.name}</p>
                </div>
                <Button variant="secondary" onClick={logout}>Logout</Button>
            </header>

            {successMessage && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-down">
                    {successMessage}
                </div>
            )}

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <Button variant={activeTab === 'departments' ? 'primary' : 'outline'} onClick={() => setActiveTab('departments')}>Departments</Button>
                <Button variant={activeTab === 'classes' ? 'primary' : 'outline'} onClick={() => setActiveTab('classes')}>Classes</Button>
                <Button variant={activeTab === 'teachers' ? 'primary' : 'outline'} onClick={() => setActiveTab('teachers')}>Teachers</Button>
                <Button variant={activeTab === 'hods' ? 'primary' : 'outline'} onClick={() => setActiveTab('hods')}>Assign HODs</Button>
                <Button variant={activeTab === 'advisors' ? 'primary' : 'outline'} onClick={() => setActiveTab('advisors')}>Class Advisors</Button>
                <Button variant={activeTab === 'analytics' ? 'primary' : 'outline'} onClick={() => setActiveTab('analytics')}>Analytics</Button>
            </div>

            {renderContent()}

            <Modal isOpen={showConfirmation} onClose={handleDiscard}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Confirm Action</h3>
                    <p className="text-gray-600">
                        Are you sure you want to {confirmationType === 'addDepartment' ? 'create this department' :
                            confirmationType === 'addClass' ? 'create this class' :
                                confirmationType === 'addTeacher' ? 'add this teacher' :
                                    confirmationType === 'assignHOD' ? 'assign this HOD' :
                                        confirmationType === 'assignAdvisor' ? 'assign this advisor' : 'proceed'}?
                    </p>
                    {pendingData && (
                        <div className="bg-gray-100 p-3 rounded text-sm">
                            {confirmationType === 'addDepartment' && <p><strong>Name:</strong> {pendingData.name}</p>}
                            {confirmationType === 'addClass' && <p><strong>Name:</strong> {pendingData.name}</p>}
                            {confirmationType === 'addTeacher' && <p><strong>Name:</strong> {pendingData.name}<br /><strong>Role:</strong> {pendingData.extras.title}</p>}
                            {confirmationType === 'assignHOD' && <p><strong>Teacher ID:</strong> {pendingData.teacherId}</p>}
                            {confirmationType === 'assignAdvisor' && <p><strong>Class ID:</strong> {pendingData.classId}</p>}
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={handleDiscard}>Discard</Button>
                        <Button onClick={handleConfirm}>Create</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManagementDashboard;
