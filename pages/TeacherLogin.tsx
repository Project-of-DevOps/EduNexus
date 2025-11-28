import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole, TeachingAssignment } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const TeacherLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login, signUp } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [teacherType, setTeacherType] = useState<'school' | 'college' | null>(null);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uniqueId, setUniqueId] = useState('');
    const [instituteName, setInstituteName] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Sign Up State
    const [signName, setSignName] = useState('');
    const [signEmail, setSignEmail] = useState('');
    const [signPassword, setSignPassword] = useState('');
    const [signUniqueId, setSignUniqueId] = useState('');
    const [teacherTitle, setTeacherTitle] = useState('');
    const [department, setDepartment] = useState('');

    // Teaching Assignments (Subject + Class)
    const [currentSubject, setCurrentSubject] = useState('');
    const [currentClass, setCurrentClass] = useState('');
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);

    // Class Teacher Specific
    const [classInChargeId, setClassInChargeId] = useState('');

    const [signError, setSignError] = useState('');
    const [showSignPassword, setShowSignPassword] = useState(false);

    // Role Categories
    const managementRoles = ['Chairman', 'Director', 'Principal', 'Vice Principal', 'Dean'];
    const teachingRoles = [
        'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer',
        'Senior Teacher', 'Subject Teacher', 'HOD',
        'Class Teacher', 'Class Teacher (Advisor)'
    ];
    const classTeacherRoles = ['Class Teacher', 'Class Teacher (Advisor)'];

    const departments = ['CSE', 'ECE', 'Mechanical', 'Science', 'Mathematics', 'Accounts', 'English', 'Social Studies'];

    const isManagementRole = (role: string) => managementRoles.includes(role);
    const isTeachingRole = (role: string) => teachingRoles.includes(role);
    const isClassTeacher = (role: string) => classTeacherRoles.includes(role);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!uniqueId.trim()) {
            setError('Unique ID is required.');
            return;
        }
        if (login(email, password, UserRole.Teacher)) {
            navigate('/dashboard');
        } else {
            setError('Invalid credentials.');
        }
    };

    const handleAddAssignment = () => {
        if (currentSubject.trim() && currentClass.trim()) {
            setTeachingAssignments([...teachingAssignments, { subject: currentSubject.trim(), classId: currentClass.trim() }]);
            setCurrentSubject('');
            setCurrentClass('');
        }
    };

    const removeAssignment = (index: number) => {
        const newAssignments = [...teachingAssignments];
        newAssignments.splice(index, 1);
        setTeachingAssignments(newAssignments);
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setSignError('');

        if (!signName || !signEmail || !signPassword || !signUniqueId) {
            setSignError('All fields are required.');
            return;
        }

        if (!teacherTitle) {
            setSignError('Please select a role.');
            return;
        }

        // Validation for Teaching Roles
        if (isTeachingRole(teacherTitle)) {
            if (!department) {
                setSignError('Department is required for teaching roles.');
                return;
            }
            if (teachingAssignments.length === 0) {
                setSignError('At least one teaching assignment (Subject + Class) is required.');
                return;
            }
        }

        // Validation for Class Teacher
        if (isClassTeacher(teacherTitle) && !classInChargeId) {
            setSignError('Class ID (In-Charge) is required for Class Teachers.');
            return;
        }

        const extras: Record<string, any> = {
            instituteName,
            uniqueId: signUniqueId,
            title: teacherTitle,
            department,
            teachingAssignments,
            teacherType
        };
        if (classInChargeId) extras.classId = classInChargeId;

        if (signUp(signName, signEmail, signPassword, UserRole.Teacher, extras)) {
            navigate('/dashboard');
        } else {
            setSignError('Sign-up failed.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-[#1e3a8a]">EduNexus AI</h1>
                    <p className="mt-2 text-lg font-bold text-gray-900">Teacher Portal</p>
                </div>

                <Card>
                    {!teacherType ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-center mb-4">Select Login Type</h2>
                            <Button className="w-full" onClick={() => setTeacherType('school')}>School Login</Button>
                            <Button className="w-full" onClick={() => setTeacherType('college')}>College Login</Button>
                            <div className="mt-4 text-center">
                                <button onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Role Selection</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={() => setTeacherType(null)} className="text-sm text-[rgb(var(--text-secondary-color))] hover:text-[rgb(var(--text-color))]">← Back</button>
                                <h2 className="text-xl font-bold capitalize">{teacherType} Login</h2>
                                <div className="w-8"></div>
                            </div>

                            {isLogin ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <Input id="uniqueId" label="Unique ID" value={uniqueId} onChange={e => setUniqueId(e.target.value)} required />
                                    <Input id="institute" label="Institute Name" value={instituteName} onChange={e => setInstituteName(e.target.value)} />
                                    <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                                    <Input id="password" label="Password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />

                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-[rgb(var(--primary-color))]">
                                            {showPassword ? 'Hide' : 'Show'} Password
                                        </button>
                                    </div>

                                    {error && <p className="text-sm text-red-500">{error}</p>}

                                    <Button type="submit" className="w-full">Sign In</Button>

                                    <div className="text-center mt-4">
                                        <p className="text-sm">Don't have an account? <button type="button" onClick={() => setIsLogin(false)} className="text-[rgb(var(--primary-color))] font-bold">Sign Up</button></p>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <Input id="signName" label="Full Name" value={signName} onChange={e => setSignName(e.target.value)} required />
                                    <Input id="signUniqueId" label="Unique ID" value={signUniqueId} onChange={e => setSignUniqueId(e.target.value)} required />
                                    <Input id="institute" label="Institute Name" value={instituteName} onChange={e => setInstituteName(e.target.value)} />
                                    <Input id="signEmail" label="Email" type="email" value={signEmail} onChange={e => setSignEmail(e.target.value)} required />
                                    <Input id="signPassword" label="Password" type={showSignPassword ? "text" : "password"} value={signPassword} onChange={e => setSignPassword(e.target.value)} required />

                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setShowSignPassword(!showSignPassword)} className="text-xs text-[rgb(var(--primary-color))]">
                                            {showSignPassword ? 'Hide' : 'Show'} Password
                                        </button>
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium">Role</label>
                                        <select
                                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                            value={teacherTitle}
                                            onChange={e => setTeacherTitle(e.target.value)}
                                        >
                                            <option value="">-- Select Role --</option>
                                            {teacherType === 'school' ? (
                                                ['Chairman', 'Director', 'Principal', 'Vice Principal', 'HOD', 'Senior Teacher', 'Class Teacher', 'Subject Teacher'].map(r => <option key={r} value={r}>{r}</option>)
                                            ) : (
                                                ['Chairman', 'Director', 'Principal', 'Vice Principal', 'Dean', 'HOD', 'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Class Teacher (Advisor)', 'Subject Teacher'].map(r => <option key={r} value={r}>{r}</option>)
                                            )}
                                        </select>
                                    </div>

                                    {/* Department Selection (For Teaching Roles) */}
                                    {isTeachingRole(teacherTitle) && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Department</label>
                                            <select
                                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                                                value={department}
                                                onChange={e => setDepartment(e.target.value)}
                                            >
                                                <option value="">-- Select Department --</option>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Teaching Assignments (Subject + Class) */}
                                    {isTeachingRole(teacherTitle) && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Teaching Assignments</label>
                                            <p className="text-xs text-gray-500">Pair each subject with the class you teach it to.</p>

                                            <div className="flex gap-2">
                                                <Input
                                                    id="subject"
                                                    label=""
                                                    placeholder="Subject (e.g. Math)"
                                                    value={currentSubject}
                                                    onChange={e => setCurrentSubject(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    id="class"
                                                    label=""
                                                    placeholder="Class (e.g. 5A)"
                                                    value={currentClass}
                                                    onChange={e => setCurrentClass(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button type="button" onClick={handleAddAssignment}>Add</Button>
                                            </div>

                                            <div className="space-y-2 mt-2">
                                                {teachingAssignments.map((assign, index) => (
                                                    <div key={index} className="flex justify-between items-center bg-[rgb(var(--subtle-background-color))] p-2 rounded text-sm">
                                                        <span><strong>{assign.subject}</strong> to <strong>{assign.classId}</strong></span>
                                                        <button type="button" onClick={() => removeAssignment(index)} className="text-red-500 hover:text-red-700">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Class Teacher Specific */}
                                    {isClassTeacher(teacherTitle) && (
                                        <div className="space-y-2 border-t pt-4 mt-4">
                                            <h3 className="text-sm font-bold">Class Teacher Responsibility</h3>
                                            <Input
                                                id="classInCharge"
                                                label="Class In-Charge (e.g. 5A)"
                                                value={classInChargeId}
                                                onChange={e => setClassInChargeId(e.target.value)}
                                                placeholder="Enter the class you manage"
                                                required
                                            />
                                        </div>
                                    )}

                                    {signError && <p className="text-sm text-red-500">{signError}</p>}

                                    <Button type="submit" className="w-full">Create Account</Button>

                                    <div className="text-center mt-4">
                                        <p className="text-sm">Already have an account? <button type="button" onClick={() => setIsLogin(true)} className="text-[rgb(var(--primary-color))] font-bold">Sign In</button></p>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TeacherLogin;
