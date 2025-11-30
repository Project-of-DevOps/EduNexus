import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { UserRole, TeachingAssignment } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const TeacherLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login, signUp } = useAuth();
    const { verifyTeacherCode, consumeTeacherCode } = useData();

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

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const validateLogin = () => {
        const newErrors: Record<string, string> = {};
        if (!uniqueId.trim()) newErrors.uniqueId = 'Unique ID is required.';
        if (!email.trim()) newErrors.email = 'Email is required.';
        if (!password.trim()) newErrors.password = 'Password is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSignUp = () => {
        const newErrors: Record<string, string> = {};
        if (!signName.trim()) newErrors.signName = 'Full Name is required.';
        if (!signUniqueId.trim()) newErrors.signUniqueId = 'Unique ID is required.';
        if (!signEmail.trim()) newErrors.signEmail = 'Email is required.';
        if (!signPassword.trim()) newErrors.signPassword = 'Password is required.';

        if (!teacherTitle) newErrors.teacherTitle = 'Role is required.';

        if (isTeachingRole(teacherTitle)) {
            if (!department) newErrors.department = 'Department is required.';
            if (teachingAssignments.length === 0) newErrors.teachingAssignments = 'At least one teaching assignment is required.';
        }

        if (isClassTeacher(teacherTitle) && !classInChargeId) {
            newErrors.classInChargeId = 'Class ID is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateLogin()) return;

        // include orgType when available to disambiguate school vs institute accounts
        const loginExtra: Record<string, any> = {};
        if (teacherType) loginExtra.orgType = teacherType === 'college' ? 'institute' : teacherType;

        if (login(email, password, UserRole.Teacher, loginExtra)) {
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

        if (!validateSignUp()) return;

        // Verify Unique Code
        const pendingTeacher = verifyTeacherCode(signUniqueId);
        if (!pendingTeacher) {
            setSignError('Invalid Unique Code. Please contact Management.');
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

        // include orgType for teacher sign-ups (map 'college' -> 'institute')
        if (teacherType) extras.orgType = teacherType === 'college' ? 'institute' : teacherType;

        if (signUp(signName, signEmail, signPassword, UserRole.Teacher, extras)) {
            consumeTeacherCode(signUniqueId); // Consume the code so it can't be used again
            navigate('/dashboard');
        } else {
            setSignError('Sign-up failed.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
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
                            <Button className="w-full" onClick={() => setTeacherType('college')}>Institute Login</Button>
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
                                    <Input
                                        id="uniqueId"
                                        label="Unique ID"
                                        value={uniqueId}
                                        onChange={e => setUniqueId(e.target.value)}
                                        error={errors.uniqueId}
                                        className="text-black"
                                    />
                                    <Input
                                        id="institute"
                                        label="Institute Name"
                                        value={instituteName}
                                        onChange={e => setInstituteName(e.target.value)}
                                        className="text-black"
                                    />
                                    <Input
                                        id="email"
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        error={errors.email}
                                        className="text-black"
                                    />
                                    <Input
                                        id="password"
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        error={errors.password}
                                        className="text-black"
                                    />

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
                                    <Input
                                        id="signName"
                                        label="Full Name"
                                        value={signName}
                                        onChange={e => setSignName(e.target.value)}
                                        error={errors.signName}
                                        className="text-black"
                                    />
                                    <Input
                                        id="signUniqueId"
                                        label="Unique ID"
                                        value={signUniqueId}
                                        onChange={e => setSignUniqueId(e.target.value)}
                                        error={errors.signUniqueId}
                                        className="text-black"
                                    />
                                    <Input
                                        id="institute"
                                        label="Institute Name"
                                        value={instituteName}
                                        onChange={e => setInstituteName(e.target.value)}
                                        className="text-black"
                                    />
                                    <Input
                                        id="signEmail"
                                        label="Email"
                                        type="email"
                                        value={signEmail}
                                        onChange={e => setSignEmail(e.target.value)}
                                        error={errors.signEmail}
                                        className="text-black"
                                    />
                                    <Input
                                        id="signPassword"
                                        label="Password"
                                        type={showSignPassword ? "text" : "password"}
                                        value={signPassword}
                                        onChange={e => setSignPassword(e.target.value)}
                                        error={errors.signPassword}
                                        className="text-black"
                                    />

                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setShowSignPassword(!showSignPassword)} className="text-xs text-[rgb(var(--primary-color))]">
                                            {showSignPassword ? 'Hide' : 'Show'} Password
                                        </button>
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium">Role</label>
                                        <select
                                            className={`w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 ${errors.teacherTitle ? 'border-red-500' : ''}`}
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
                                        {errors.teacherTitle && <p className="text-sm text-red-500">{errors.teacherTitle}</p>}
                                    </div>

                                    {/* Department Selection (For Teaching Roles) */}
                                    {isTeachingRole(teacherTitle) && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium">Department</label>
                                            <select
                                                className={`w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 ${errors.department ? 'border-red-500' : ''}`}
                                                value={department}
                                                onChange={e => setDepartment(e.target.value)}
                                            >
                                                <option value="">-- Select Department --</option>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            {errors.department && <p className="text-sm text-red-500">{errors.department}</p>}
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
                                                    className="flex-1 text-black"
                                                />
                                                <Input
                                                    id="class"
                                                    label=""
                                                    placeholder="Class (e.g. 5A)"
                                                    value={currentClass}
                                                    onChange={e => setCurrentClass(e.target.value)}
                                                    className="flex-1 text-black"
                                                />
                                                <Button type="button" onClick={handleAddAssignment}>Add</Button>
                                            </div>
                                            {errors.teachingAssignments && <p className="text-sm text-red-500">{errors.teachingAssignments}</p>}

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
                                                error={errors.classInChargeId}
                                                className="text-black"
                                            />
                                        </div>
                                    )}

                                    {signError && <p className="text-sm text-red-500">{signError}</p>}

                                    <Button type="submit" className="w-full">Create Account</Button>

                                    <div className="text-center mt-4">
                                        <p className="text-sm">Already have an account? <button type="button" onClick={() => setIsLogin(true)} className="text-[rgb(var(--primary-color))] font-bold">Sign In</button></p>
                                    </div>
                                    <div className="text-center mt-2">
                                        <button type="button" onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Role Selection</button>
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
