import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { UserRole, TeacherExtended, TeacherTitle } from '../types';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import ProfileView from '../components/shared/ProfileView';
import ManagementNotifications from '../components/management/ManagementNotifications';
import { ManagementSignupsContent } from './ManagementSignups';
import UserSearchFilter from '../components/UserSearchFilter';
import BulkUserImport from '../components/BulkUserImport';
import BulkActions from '../components/BulkActions';
import ActivityLogViewer from '../components/ActivityLogViewer';
import DashboardOverview from '../components/DashboardOverview';
import axios from 'axios';

const ManagementDashboard: React.FC = () => {
    const { user } = useAuth();
    const {
        users,
        departments, addDepartment, updateDepartment, deleteDepartment,
        classes, addClass, deleteClass,
        teachers: allTeachers, assignHOD, assignClassTeacher,
        students, parents, addPendingTeacher, pendingTeachers: allPendingTeachers, deleteUser, deletePendingTeacher,
        pendingOrgRequests: allPendingOrgRequests, addOrgRequest, approveOrgRequest, rejectOrgRequest, deleteOrgRequest,
        // management code features added
        createOrgCodeRequest, confirmOrgCodeRequest, orgCodes, pendingCodeRequests, getNotificationsForEmail, viewOrgCode,
        // pending management signups
        pendingManagementSignups, retryPendingSignup, cancelPendingSignup
    } = useData();

    const isInstitute = (user as any)?.type === 'institute';
    const currentOrgType = isInstitute ? 'institute' : 'school';
    // Use the management user's instituteId to scope data strictly.
    const currentInstituteId = (user as any)?.instituteId || null;

    const navigate = useNavigate();

    // Filter teachers based on the current view context
    const teachers = allTeachers.filter(t => {
        const tExt = t as TeacherExtended;
        // If orgType is undefined, assume it belongs to both or legacy (optional: or filter out)
        // For strict separation:
        // Prefer explicit instituteId matching if available to avoid cross-org mixing
        if (currentInstituteId && (t as any).instituteId) return (t as any).instituteId === currentInstituteId;
        return tExt.orgType === currentOrgType;
    });

    const pendingTeachers = allPendingTeachers.filter(p => p.orgType === currentOrgType);

    // Departments & classes strictly scoped to current instituteId (if present)
    const visibleDepartments = departments.filter(d => currentInstituteId ? d.instituteId === currentInstituteId : true);
    const visibleClasses = classes.filter(c => visibleDepartments.some(d => d.id === c.departmentId));

    const [activeTab, setActiveTab] = useState('Role Management');

    // Teacher Tab State
    const [teacherViewMode, setTeacherViewMode] = useState<'pending' | 'existing'>('pending');

    // Classes Tab State
    const [viewingBranch, setViewingBranch] = useState<string | null>(null);
    const [isSingleClass, setIsSingleClass] = useState(false);
    const [firstSectionName, setFirstSectionName] = useState('A');
    const [newSectionName, setNewSectionName] = useState('');

    // Class Creation State
    const [classCreationType, setClassCreationType] = useState<'multi' | 'single'>('multi');

    const [multiSectionInputs, setMultiSectionInputs] = useState<string[]>(['']); // Array of section names

    // Form States
    const [newDeptName, setNewDeptName] = useState('');
    const [isAddingDept, setIsAddingDept] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [editDeptName, setEditDeptName] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');

    // Teacher Add State
    const [teacherRole, setTeacherRole] = useState('');
    const [teacherDept, setTeacherDept] = useState('');

    // Org request form (shared)
    const [reqName, setReqName] = useState('');
    const [reqEmail, setReqEmail] = useState('');
    const [reqRole, setReqRole] = useState<UserRole | ''>('');
    const [createdRequestCode, setCreatedRequestCode] = useState<string | null>(null);
    // Management-code UI states
    const [managementEmailForCode, setManagementEmailForCode] = useState((user as any)?.email || '');
    const [codeRequestSent, setCodeRequestSent] = useState<string | null>(null); // token
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    const [selectedHodDept, setSelectedHodDept] = useState('');
    const [selectedHodTeacher, setSelectedHodTeacher] = useState('');

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedAdvisorTeacher, setSelectedAdvisorTeacher] = useState('');

    // Org management UI states
    const [reqOrgType, setReqOrgType] = useState<'institute' | 'school'>('institute');
    const [showOrgPeopleModal, setShowOrgPeopleModal] = useState(false);
    const [orgPeopleList, setOrgPeopleList] = useState<any[]>([]);

    // Confirmation State
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationType, setConfirmationType] = useState<'addDepartment' | 'addClass' | 'addTeacher' | 'assignHOD' | 'assignAdvisor' | null>(null);
    const [pendingData, setPendingData] = useState<any>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [approveRequireActivation, setApproveRequireActivation] = useState(true);

    // Analytics Modal State
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [analyticsModalType, setAnalyticsModalType] = useState<'dept' | 'branch' | null>(null);
    const [selectedAnalyticsItem, setSelectedAnalyticsItem] = useState<string | null>(null);

    // Secure View Code State
    const [showViewCodeModal, setShowViewCodeModal] = useState(false);
    const [viewCodePassword, setViewCodePassword] = useState('');
    const [viewCodeError, setViewCodeError] = useState('');
    const [viewedCode, setViewedCode] = useState<string | null>(null);
    const [viewingOrgType, setViewingOrgType] = useState<'school' | 'institute' | null>(null);

    // Phase 1: New State
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // IDs

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setSuccessMessage('Copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                fallbackCopyTextToClipboard(text);
            });
        } else {
            fallbackCopyTextToClipboard(text);
        }
    };

    const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            if (successful) {
                setSuccessMessage('Copied to clipboard!');
            } else {
                setSuccessMessage('Unable to copy');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            setSuccessMessage('Failed to copy');
        }

        document.body.removeChild(textArea);
    };

    useEffect(() => {
        if (activeTab === 'Overview') {
            fetchDashboardStats();
        } else if (activeTab === 'Activity Logs') {
            fetchActivityLogs();
        }
    }, [activeTab]);

    const fetchDashboardStats = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/management/stats`, { withCredentials: true });
            setDashboardStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchActivityLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/management/activity-logs`, { withCredentials: true });
            setActivityLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleBulkImport = async (importedUsers: any[]) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/management/users/bulk`, { users: importedUsers }, { withCredentials: true });
            setSuccessMessage(`Imported ${res.data.results.filter((r: any) => r.status === 'created').length} users successfully.`);
            // Refresh data
            fetchActivityLogs();
        } catch (err) {
            setSuccessMessage('Failed to import users.');
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
            // Implement bulk delete API call here
            // await axios.post(..., { ids: selectedUsers });
            setSuccessMessage('Bulk delete not fully implemented yet.');
            setSelectedUsers([]);
        }
    };

    const handleViewCode = async () => {
        if (!viewCodePassword) {
            setViewCodeError('Password is required');
            return;
        }
        if (!viewingOrgType) return;

        const res = await viewOrgCode(viewCodePassword, viewingOrgType as 'school' | 'institute');
        if (res.success && res.code) {
            setViewedCode(res.code);
            setShowViewCodeModal(false);
            setViewCodePassword('');
            setViewCodeError('');
        } else {
            setViewCodeError(res.error || 'Failed to retrieve code');
        }
    };

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
                // Generate Code Logic is handled in handleAddTeacher now, this confirmation might be redundant or just for final commit?
                // Actually, let's change the flow. The "Add Teacher" button now just generates code.
                // But if we want confirmation:
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                addPendingTeacher({
                    code,
                    role: pendingData.role,
                    department: pendingData.department,
                    orgType: currentOrgType
                });
                setGeneratedCode(code);
                setTeacherRole('');
                setTeacherDept('');
                setSuccessMessage('Unique Code Generated Successfully');
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

        // Message will stay visible until dismissed by the user
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
            // Use the management user's instituteId so the created department is
            // scoped to this organization. If the instituteId is not set, fall
            // back to a generic name placeholder.
            const instituteIdForDept = currentInstituteId || ((user as any)?.instituteId || 'unknown');
            initiateAction('addDepartment', { name: newDeptName, instituteId: instituteIdForDept });
            setIsAddingDept(false);
        }
    };

    const handleRenameDepartment = (id: string) => {
        if (editDeptName.trim()) {
            updateDepartment(id, editDeptName);
            setEditingDeptId(null);
            setEditDeptName('');
            setSuccessMessage('Department Renamed Successfully');
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
        if (teacherRole) {
            initiateAction('addTeacher', {
                role: teacherRole,
                department: teacherDept
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
            case 'Overview':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold">Dashboard Overview</h3>
                        {dashboardStats ? (
                            <DashboardOverview
                                stats={dashboardStats.stats}
                                roleDistribution={dashboardStats.roleDistribution}
                                departmentDistribution={dashboardStats.departmentDistribution}
                            />
                        ) : (
                            <p>Loading stats...</p>
                        )}
                        <div className="mt-8">
                            <ActivityLogViewer logs={activityLogs} isLoading={loadingLogs} />
                        </div>
                    </div>
                );
            case 'Activity Logs':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold">System Activity Logs</h3>
                        <ActivityLogViewer logs={activityLogs} isLoading={loadingLogs} />
                    </div>
                );
            case 'Institute Management':
                const existingInstituteCodes = orgCodes.filter(c => c.orgType === 'institute' && (c.instituteId ? c.instituteId === currentInstituteId : true));
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Institute Management</h3>
                        </div>

                        <Card className="p-6">
                            <h4 className="text-lg font-bold mb-2">Institute Code</h4>

                            {existingInstituteCodes.length === 0 ? (
                                <>
                                    {pendingCodeRequests?.filter(r => r.orgType === 'institute' && (r.instituteId ? r.instituteId === currentInstituteId : true)).length > 0 ? (
                                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <h5 className="font-bold text-yellow-800 mb-2">Pending Request</h5>
                                            <p className="text-sm text-yellow-700 mb-2">A request for an Institute Code is pending approval.</p>
                                            {pendingCodeRequests?.filter(r => r.orgType === 'institute' && (r.instituteId ? r.instituteId === currentInstituteId : true)).map(req => (
                                                <div key={req.id} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-100 mb-2">
                                                    <div>
                                                        <div className="text-xs text-gray-500">Reference Token</div>
                                                        <div className="font-mono font-bold text-sm">{req.token}</div>
                                                        <div className="text-xs text-gray-400">{new Date(req.requestAt).toLocaleString()}</div>
                                                    </div>
                                                    <Button size="sm" onClick={async () => {
                                                        if (!req.token) return;
                                                        const res = await confirmOrgCodeRequest(req.token);
                                                        if (res && (res as any).success) {
                                                            setSuccessMessage('Code request confirmed successfully!');
                                                        } else {
                                                            setSuccessMessage('Failed to confirm request.');
                                                        }
                                                    }}>Simulate Dev Confirm</Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-500 mb-2">Create Institute code — after creating, send an email to developer for confirmation to finalize the code.</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Request EduNexus AI to Register</label>
                                                    <Input id="mgmtCodeEmailInst" label="" value={managementEmailForCode} onChange={e => setManagementEmailForCode(e.target.value)} />
                                                </div>
                                                <div className="col-span-2 flex gap-2">
                                                    <Button onClick={async () => {
                                                        if (!managementEmailForCode.trim()) return setSuccessMessage('Management email is required');
                                                        const req = await createOrgCodeRequest({ orgType: 'institute', instituteId: currentInstituteId || undefined, managementEmail: managementEmailForCode });
                                                        setCodeRequestSent(req.token);
                                                        setSuccessMessage('Code request sent to developer');
                                                    }}>Create Institute Code</Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-green-600 mb-4">You have already created an Institute Code.</p>
                            )}

                            <div className="mt-4">
                                <h5 className="font-semibold">Published Codes</h5>
                                {existingInstituteCodes.length === 0 && <p className="text-gray-500">No codes yet.</p>}
                                <div className="space-y-2 mt-2">
                                    {existingInstituteCodes.map(c => (
                                        <div key={c.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded flex items-center justify-between">
                                            <div>
                                                <div className="font-mono font-bold text-lg">
                                                    {viewedCode && viewingOrgType === 'institute' ? viewedCode : '******'}
                                                </div>
                                                <div className="text-xs text-[rgb(var(--text-secondary-color))]">Created: {new Date(c.createdAt).toLocaleDateString('en-GB')}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                {viewedCode && viewingOrgType === 'institute' ? (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => copyToClipboard(viewedCode)}>Copy</Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setViewedCode(null); setViewingOrgType(null); }}>Hide</Button>
                                                    </>
                                                ) : (
                                                    <Button size="sm" variant="secondary" onClick={() => { setViewingOrgType('institute'); setShowViewCodeModal(true); }}>View Code</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {existingInstituteCodes.length === 0 && (
                            <Card className="p-6">
                                <h4 className="text-lg font-bold mb-3">Pending Institute Requests</h4>
                                {allPendingOrgRequests.filter(r => r.orgType === 'institute' && r.status === 'pending' && (r.instituteId ? r.instituteId === currentInstituteId : true)).length === 0 && <p className="text-gray-500">No pending requests for this institute.</p>}
                                <div className="space-y-2">
                                    {allPendingOrgRequests.filter(r => r.orgType === 'institute' && r.status === 'pending' && (r.instituteId ? r.instituteId === currentInstituteId : true)).map(req => (
                                        <div key={req.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold">{req.name || '(No name)'} — {req.email}</div>
                                                <div className="text-xs text-[rgb(var(--text-secondary-color))]">Code: <span className="font-mono">{req.code}</span> • Status: {req.status}</div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <Button size="sm" variant="secondary" onClick={() => {
                                                    const res = approveOrgRequest(req.id, { requireActivation: approveRequireActivation });
                                                    if (res !== false && res.success) {
                                                        setSuccessMessage('Approved');
                                                        if (res.activationToken) setCreatedRequestCode(res.activationToken);
                                                        if (res.tempPassword) setCreatedRequestCode(res.tempPassword);
                                                    }
                                                }}>Approve</Button>
                                                <Button size="sm" variant="danger" onClick={() => { rejectOrgRequest(req.id); setSuccessMessage('Rejected'); }}>Reject</Button>
                                                <Button size="sm" variant="outline" onClick={() => { deleteOrgRequest(req.id); setSuccessMessage('Deleted'); }}>Delete</Button>
                                                <Button size="sm" variant="secondary" onClick={() => { const people = users.filter(u => (u as any).instituteId === req.instituteId || (u as any).orgType === 'institute'); setOrgPeopleList(people); setShowOrgPeopleModal(true); }}>See existing people</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <div className="mt-4">
                            <h5 className="font-semibold">Pending Management Signups</h5>
                            {pendingManagementSignups.filter(p => !p.email || (p.email && (p.email.includes('@') ? true : true))).length === 0 && (
                                <p className="text-gray-500">No queued signups pending synchronization.</p>
                            )}
                            <div className="space-y-2 mt-2">
                                {pendingManagementSignups.map(p => (
                                    <div key={p.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold">{p.email} <span className="text-xs text-gray-400">(created {new Date(p.createdAt).toLocaleString()})</span></div>
                                            <div className="text-xs text-[rgb(var(--text-secondary-color))]">Attempts: {p.attempts || 0} {p.error ? `• Error: ${p.error}` : ''}</div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button size="sm" variant="secondary" onClick={() => retryPendingSignup(p.id)}>Retry</Button>
                                            <Button size="sm" variant="outline" onClick={() => cancelPendingSignup(p.id)}>Cancel</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'School Management':
                const existingSchoolCodes = orgCodes.filter(c => c.orgType === 'school' && (c.instituteId ? c.instituteId === currentInstituteId : true));
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">School Management</h3>
                        </div>

                        <Card className="p-6 mt-4">
                            <h4 className="text-lg font-bold mb-2">School Code</h4>

                            {existingSchoolCodes.length === 0 ? (
                                <>
                                    {pendingCodeRequests?.filter(r => r.orgType === 'school' && (r.instituteId ? r.instituteId === currentInstituteId : true)).length > 0 ? (
                                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <h5 className="font-bold text-yellow-800 mb-2">Pending Request</h5>
                                            <p className="text-sm text-yellow-700 mb-2">A request for a School Code is pending approval.</p>
                                            {pendingCodeRequests?.filter(r => r.orgType === 'school' && (r.instituteId ? r.instituteId === currentInstituteId : true)).map(req => (
                                                <div key={req.id} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-100 mb-2">
                                                    <div>
                                                        <div className="text-xs text-gray-500">Reference Token</div>
                                                        <div className="font-mono font-bold text-sm">{req.token}</div>
                                                        <div className="text-xs text-gray-400">{new Date(req.requestAt).toLocaleString()}</div>
                                                    </div>
                                                    <Button size="sm" onClick={async () => {
                                                        if (!req.token) return;
                                                        const res = await confirmOrgCodeRequest(req.token);
                                                        if (res && (res as any).success) {
                                                            setSuccessMessage('Code request confirmed successfully!');
                                                        } else {
                                                            setSuccessMessage('Failed to confirm request.');
                                                        }
                                                    }}>Simulate Dev Confirm</Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-500 mb-2">Create School code — after creating, send an email to developer for confirmation to finalize the code.</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Management email to receive final code</label>
                                                    <Input id="mgmtCodeEmailSchool" label="" value={managementEmailForCode} onChange={e => setManagementEmailForCode(e.target.value)} />
                                                </div>
                                                <div className="col-span-2 flex gap-2">
                                                    <Button onClick={async () => {
                                                        if (!managementEmailForCode.trim()) return setSuccessMessage('Management email is required');
                                                        const req = await createOrgCodeRequest({ orgType: 'school', instituteId: currentInstituteId || undefined, managementEmail: managementEmailForCode });
                                                        setCodeRequestSent(req.token);
                                                        setSuccessMessage('School code request sent to developer');
                                                    }}>Create School Code</Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-green-600 mb-4">You have already created a School Code.</p>
                            )}

                            <div className="mt-4">
                                <h5 className="font-semibold">Published Codes</h5>
                                {existingSchoolCodes.length === 0 && <p className="text-gray-500">No codes yet.</p>}
                                <div className="space-y-2 mt-2">
                                    {existingSchoolCodes.map(c => (
                                        <div key={c.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded flex items-center justify-between">
                                            <div>
                                                <div className="font-mono font-bold text-lg">
                                                    {viewedCode && viewingOrgType === 'school' ? viewedCode : '******'}
                                                </div>
                                                <div className="text-xs text-[rgb(var(--text-secondary-color))]">Created: {new Date(c.createdAt).toLocaleString()}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                {viewedCode && viewingOrgType === 'school' ? (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => copyToClipboard(viewedCode)}>Copy</Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setViewedCode(null); setViewingOrgType(null); }}>Hide</Button>
                                                    </>
                                                ) : (
                                                    <Button size="sm" variant="secondary" onClick={() => { setViewingOrgType('school'); setShowViewCodeModal(true); }}>View Code</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h4 className="text-lg font-bold mb-3">Pending School Requests</h4>
                            {allPendingOrgRequests.filter(r => r.orgType === 'school' && r.status === 'pending' && (r.instituteId ? r.instituteId === currentInstituteId : true)).length === 0 && <p className="text-gray-500">No pending requests for this school.</p>}
                            <div className="space-y-2">
                                {allPendingOrgRequests.filter(r => r.orgType === 'school' && r.status === 'pending' && (r.instituteId ? r.instituteId === currentInstituteId : true)).map(req => (
                                    <div key={req.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold">{req.name || '(No name)'} — {req.email}</div>
                                            <div className="text-xs text-[rgb(var(--text-secondary-color))]">Code: <span className="font-mono">{req.code}</span> • Status: {req.status}</div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Button size="sm" variant="secondary" onClick={() => {
                                                const res = approveOrgRequest(req.id, { requireActivation: approveRequireActivation });
                                                if (res !== false && res.success) {
                                                    setSuccessMessage('Approved');
                                                    if (res.activationToken) setCreatedRequestCode(res.activationToken);
                                                    if (res.tempPassword) setCreatedRequestCode(res.tempPassword);
                                                }
                                            }}>Approve</Button>
                                            <Button size="sm" variant="danger" onClick={() => { rejectOrgRequest(req.id); setSuccessMessage('Rejected'); }}>Reject</Button>
                                            <Button size="sm" variant="outline" onClick={() => { deleteOrgRequest(req.id); setSuccessMessage('Deleted'); }}>Delete</Button>
                                            <Button size="sm" variant="secondary" onClick={() => { const people = users.filter(u => (u as any).instituteId === req.instituteId || (u as any).orgType === 'school'); setOrgPeopleList(people); setShowOrgPeopleModal(true); }}>See existing people</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                );
            case 'Department':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Department</h3>
                            <Button onClick={() => setIsAddingDept(!isAddingDept)}>
                                {isAddingDept ? 'Cancel' : '+ Add Department'}
                            </Button>
                        </div>

                        {isAddingDept && (
                            <Card className="p-6 animate-fade-in-down">
                                <h4 className="text-lg font-bold mb-4">Add New Department</h4>
                                <form onSubmit={handleAddDepartment} className="flex gap-4">
                                    <Input
                                        id="deptName"
                                        label=""
                                        placeholder="Department Name (e.g. CSE)"
                                        value={newDeptName}
                                        onChange={e => setNewDeptName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit">Add</Button>
                                </form>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleDepartments.map(dept => (
                                <Card key={dept.id} className="p-4">
                                    {editingDeptId === dept.id ? (
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                id={`edit-dept-${dept.id}`}
                                                value={editDeptName}
                                                onChange={e => setEditDeptName(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button size="sm" onClick={() => handleRenameDepartment(dept.id)}>Save</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setEditingDeptId(null)}>Cancel</Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">{dept.name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingDeptId(dept.id);
                                                        setEditDeptName(dept.name);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 text-sm"
                                                >
                                                    Rename
                                                </button>
                                                <button onClick={() => deleteDepartment(dept.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                            {visibleDepartments.length === 0 && <p className="text-gray-500 col-span-full">No departments found for this organization.</p>}
                        </div>
                    </div>
                );

            case 'Role Management':
                return (
                    <div className="space-y-6">
                        <div className="flex gap-4 border-b border-[rgb(var(--border-color))] pb-2">
                            <button
                                className={`px-4 py-2 font-medium ${teacherViewMode === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                onClick={() => setTeacherViewMode('pending')}
                            >
                                Pending Sign-ups
                            </button>
                            <button
                                className={`px-4 py-2 font-medium ${teacherViewMode === 'existing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                onClick={() => setTeacherViewMode('existing')}
                            >
                                Existing Teachers
                            </button>
                        </div>

                        {teacherViewMode === 'pending' && (
                            <>
                                <UserSearchFilter
                                    roles={Object.values(TeacherTitle)}
                                    departments={visibleDepartments.map(d => d.name)}
                                    onSearch={(q, f) => console.log('Search:', q, f)}
                                />
                                <BulkUserImport onImport={handleBulkImport} />
                                <BulkActions
                                    selectedCount={selectedUsers.length}
                                    onDelete={handleBulkDelete}
                                    onExport={() => alert('Exporting...')}
                                />
                                <Card className="p-6">
                                    <h3 className="text-xl font-bold mb-4">Generate Teacher Code</h3>
                                    <p className="mb-4 text-sm text-gray-600">Select a role and department (optional) to generate a unique sign-up code for a new teacher.</p>
                                    <form onSubmit={handleAddTeacher} className="space-y-4">
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
                                                    {visibleDepartments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <Button type="submit">Generate Code</Button>
                                    </form>
                                    {generatedCode && (
                                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800 font-bold">Code Generated Successfully!</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-3xl font-mono font-bold tracking-wider">{generatedCode}</span>
                                                <Button size="sm" variant="secondary" onClick={() => copyToClipboard(generatedCode)}>Copy</Button>
                                                <Button size="sm" variant="outline" onClick={() => setGeneratedCode(null)}>Done</Button>
                                            </div>
                                            <p className="text-xs text-green-700 mt-2">Share this code with the teacher. They will need it to sign up.</p>
                                        </div>
                                    )}
                                </Card>

                                {pendingTeachers.length > 0 && (
                                    <Card className="p-6">
                                        <h3 className="text-lg font-bold mb-4">Pending Sign-ups</h3>
                                        <div className="space-y-2">
                                            {pendingTeachers.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-[rgb(var(--subtle-background-color))] p-2 rounded">
                                                    <div>
                                                        <span className="font-mono font-bold mr-2">{p.code}</span>
                                                        <span className="text-sm text-gray-500">{p.role} {p.department ? `(${p.department})` : ''}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Waiting for Sign-up</span>
                                                        <button onClick={() => deletePendingTeacher(p.code)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}

                        {teacherViewMode === 'existing' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Existing Teachers</h3>
                                {teachers.map(t => (
                                    <Card key={t.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{t.name}</p>
                                            <p className="text-sm text-gray-500">{(t as TeacherExtended).title || 'Teacher'} - {t.email}</p>
                                        </div>
                                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{(t as TeacherExtended).department || 'No Dept'}</span>
                                        <button onClick={() => deleteUser(t.id)} className="text-red-500 hover:text-red-700 ml-4">Remove</button>
                                    </Card>
                                ))}
                                {teachers.length === 0 && <p className="text-gray-500">No existing teachers found.</p>}
                            </div>
                        )}
                    </div>
                );


            case 'Analytics':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold mb-4">Institute Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Total Teachers</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{teachers.length}</p>
                            </Card>
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Total Classes</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{visibleClasses.length}</p>
                            </Card>
                            <Card className="p-6 text-center">
                                <h4 className="text-lg font-bold text-gray-500">Departments</h4>
                                <p className="text-4xl font-extrabold text-[#1e3a8a] mt-2">{visibleDepartments.length}</p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="p-6">
                                <h4 className="text-lg font-bold mb-4">Department Distribution</h4>
                                <div className="space-y-2">
                                    {visibleDepartments.map(d => {
                                        const count = teachers.filter(t => (t as TeacherExtended).department === d.name).length;
                                        return (
                                            <div
                                                key={d.id}
                                                className="flex justify-between items-center p-2 hover:bg-[rgb(var(--subtle-background-color))] rounded cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setSelectedAnalyticsItem(d.name);
                                                    setAnalyticsModalType('dept');
                                                    setShowAnalyticsModal(true);
                                                }}
                                            >
                                                <span className="text-blue-600 hover:underline">{d.name}</span>
                                                <span className="font-bold">{count} Teachers</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                            <Card className="p-6">
                                <h4 className="text-lg font-bold mb-4">Branch Details</h4>
                                <div className="space-y-2">
                                    {Array.from(new Set(visibleClasses.map(c => c.name.includes('-') ? c.name.split('-')[0] : c.name))).map(branch => {
                                        const sectionCount = visibleClasses.filter(c => c.name === branch || c.name.startsWith(branch + '-')).length;
                                        return (
                                            <div
                                                key={branch}
                                                className="flex justify-between items-center p-2 hover:bg-[rgb(var(--subtle-background-color))] rounded cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setSelectedAnalyticsItem(branch);
                                                    setAnalyticsModalType('branch');
                                                    setShowAnalyticsModal(true);
                                                }}
                                            >
                                                <span className="text-blue-600 hover:underline">{branch}</span>
                                                <span className="font-bold">{sectionCount} Section{sectionCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        );
                                    })}
                                    {visibleClasses.length === 0 && <p className="text-gray-500">No classes found.</p>}
                                </div>
                            </Card>
                        </div>
                    </div>
                );
            case 'Profile':
                return <ProfileView />;
            case 'Notifications':
                return <ManagementNotifications />;
            case 'Pending Signups':
                return <ManagementSignupsContent />;
            default:
                return <div>Select a tab</div>;
        }
    };

    const Icon = ({ path }: { path: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );



    // Fix: Only show one management menu item based on org type
    const navItems = [
        { name: 'Overview', icon: <Icon path="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /> },
        isInstitute
            ? { name: 'Institute Management', icon: <Icon path="M3 13.5V6.75a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6.75v6.75M3 13.5a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 13.5" /> }
            : { name: 'School Management', icon: <Icon path="M12 7l5 3.5V18a2 2 0 01-2 2H9a2 2 0 01-2-2V10.5L12 7z" /> },
        { name: 'Pending Signups', icon: <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a6 6 0 00-6 6h12a6 6 0 00-6-6z" /> },
        { name: 'Role Management', icon: <Icon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /> },
        { name: 'Department', icon: <Icon path="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /> },
        { name: 'Analytics', icon: <Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /> },
        { name: 'Notifications', icon: <Icon path="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /> },
        { name: 'Profile', icon: <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a8.25 8.25 0 0115 0" /> }
    ];

    // Clear successMessage on logout or user change
    useEffect(() => {
        setSuccessMessage('');
    }, [user]);

    return (
        <Layout navItems={navItems} activeItem={activeTab} setActiveItem={setActiveTab} profileNavItemName="Profile">
            {successMessage && (
                <div className="fixed top-4 right-4 bg-blue-900 text-blue-100 px-6 py-3 rounded shadow-lg z-50 animate-fade-in-down flex items-start gap-3">
                    <div className="flex-1 whitespace-pre-wrap">{successMessage}</div>
                    <button aria-label="Dismiss message" className="text-blue-200 hover:text-white" onClick={() => setSuccessMessage('')}>Dismiss</button>
                </div>
            )}

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
                            {confirmationType === 'addTeacher' && <p><strong>Role:</strong> {pendingData.role}<br /><strong>Department:</strong> {pendingData.department || 'None'}</p>}
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

            <Modal isOpen={showAnalyticsModal} onClose={() => setShowAnalyticsModal(false)}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">
                        {analyticsModalType === 'dept' ? `Teachers in ${selectedAnalyticsItem}` : `Sections in ${selectedAnalyticsItem}`}
                    </h3>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {analyticsModalType === 'dept' && (
                            <div className="space-y-2">
                                {teachers.filter(t => (t as TeacherExtended).department === selectedAnalyticsItem).map(t => (
                                    <div key={t.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
                                        <p className="font-bold">{t.name}</p>
                                        <p className="text-sm text-gray-500">{t.email}</p>
                                        <p className="text-xs text-gray-400">{(t as TeacherExtended).title || 'Teacher'}</p>
                                    </div>
                                ))}
                                {teachers.filter(t => (t as TeacherExtended).department === selectedAnalyticsItem).length === 0 && (
                                    <p className="text-gray-500">No teachers found in this department.</p>
                                )}
                            </div>
                        )}

                        {analyticsModalType === 'branch' && (
                            <div className="space-y-2">
                                {classes.filter(c => c.name === selectedAnalyticsItem || c.name.startsWith(selectedAnalyticsItem + '-')).map(c => (
                                    <div key={c.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                                        <span className="font-bold">{c.name}</span>
                                        <span className="text-xs text-gray-500">ID: {c.id.substring(0, 8)}...</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end mt-6">
                        <Button onClick={() => setShowAnalyticsModal(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showOrgPeopleModal} onClose={() => setShowOrgPeopleModal(false)}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Existing People</h3>
                    <p className="text-sm text-gray-500">Showing people that are already associated with this organization.</p>

                    <div className="max-h-[60vh] overflow-y-auto space-y-2">
                        {orgPeopleList.length === 0 && <p className="text-gray-500">No users found for this organization.</p>}
                        {orgPeopleList.map(u => (
                            <div key={(u as any).id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                                <div>
                                    <div className="font-semibold">{(u as any).name || '(No name)'} — {(u as any).email}</div>
                                    <div className="text-xs text-[rgb(var(--text-secondary-color))]">Role: {(u as any).role} • ID: {(u as any).id}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText((u as any).email); alert('Email copied'); }}>Copy Email</Button>
                                    <Button size="sm" variant="danger" onClick={() => { deleteUser((u as any).id); setOrgPeopleList(prev => prev.filter(x => x.id !== (u as any).id)); }}>Remove</Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button onClick={() => setShowOrgPeopleModal(false)}>Close</Button>
                    </div>
                </div>
            </Modal>
            {showViewCodeModal && (
                <Modal isOpen={true} onClose={() => { setShowViewCodeModal(false); setViewCodePassword(''); setViewCodeError(''); }}>
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold">View Organization Code</h3>
                        <p className="text-sm text-gray-500">Enter your password to view the {viewingOrgType} code.</p>
                        <Input
                            id="viewCodePass"
                            label="Password"
                            type="password"
                            value={viewCodePassword}
                            onChange={e => setViewCodePassword(e.target.value)}
                        />
                        {viewCodeError && <p className="text-red-500 text-sm">{viewCodeError}</p>}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setShowViewCodeModal(false); setViewCodePassword(''); setViewCodeError(''); }}>Cancel</Button>
                            <Button onClick={handleViewCode}>View Code</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </Layout>
    );
};

export default ManagementDashboard;
