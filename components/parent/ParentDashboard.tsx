
import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../Layout';
import Card from '../ui/Card';
import AttendanceBarChart from '../charts/AttendanceBarChart';
import SubjectPieChart from '../charts/SubjectPieChart';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../context/DataContext';
import { Parent, Student, Mark, AttendanceRecord, UserRole } from '../../types';
import { ATTENDANCE_THRESHOLD } from '../../constants';
import ProfileView from '../shared/ProfileView';


const ChildSwitcher: React.FC<{
  childrenData: Student[];
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
}> = ({ childrenData, selectedChildId, setSelectedChildId }) => {
  return (
    <div className="mb-6">
        <label htmlFor="child-select" className="block text-sm font-medium text-[rgb(var(--text-secondary-color))] mb-2">
            Viewing Dashboard For:
        </label>
        <select
            id="child-select"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full max-w-xs bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[rgb(var(--primary-color))] focus:border-[rgb(var(--primary-color))]"
        >
            {childrenData.map((child) => (
                <option key={child.id} value={child.id}>
                    {child.name}
                </option>
            ))}
        </select>
    </div>
  );
};

const ParentDashboardContent: React.FC<{ child: Student }> = ({ child }) => {
    const { marks: allMarks, attendance: allAttendance, messages } = useData();
    const childMarks = useMemo(() => allMarks.filter(m => m.studentId === child.id), [allMarks, child.id]);
    const childAttendance = useMemo(() => allAttendance.filter(a => a.studentId === child.id), [allAttendance, child.id]);

    const attendanceData = useMemo(() => {
        const total = childAttendance.length;
        const present = childAttendance.filter(a => a.status === 'present').length;
        const overall = total > 0 ? ((present / total) * 100) : 0;
        return {
            overall,
            subjectWise: [ // Mock data, would be calculated from a richer dataset
                { name: 'Data Structures', attendance: 80 },
                { name: 'Algorithms', attendance: 90 },
                { name: 'Database Systems', attendance: 70 },
            ]
        };
    }, [childAttendance]);

    const marksPieData = useMemo(() => childMarks.map(m => ({ name: m.subject, value: m.marks })), [childMarks]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-bold text-lg mb-2">Overall Attendance</h3>
                    <p className={`text-4xl font-bold ${attendanceData.overall < ATTENDANCE_THRESHOLD ? 'text-[rgb(var(--danger-color))]' : 'text-[rgb(var(--success-color))]'}`}>
                        {attendanceData.overall.toFixed(1)}%
                    </p>
                </Card>
                <Card>
                    <h3 className="font-bold text-lg mb-2">Announcements</h3>
                    <div className="h-24 overflow-y-auto">
                        <ul className="space-y-2">
                                                {messages.length ? (
                                                    messages.map(msg => (
                                                        <li key={msg.id} className="text-sm p-2 rounded bg-[rgba(var(--primary-color),0.1)]">
                                                                <strong>{msg.senderName || msg.senderId}:</strong> {msg.content}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-sm p-2">No announcements available.</li>
                                                )}
                        </ul>
                    </div>
                </Card>
            </div>
             <Card>
                <h2 className="text-xl font-bold mb-4">Attendance Details</h2>
                <AttendanceBarChart data={attendanceData.subjectWise} />
            </Card>
             <Card>
                <h2 className="text-xl font-bold mb-4">Marks Distribution</h2>
                <SubjectPieChart data={marksPieData} />
            </Card>
        </div>
    );
};

const Icon = ({ path }: { path: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);


const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const parentUser = user as Parent;
  
    const { users } = useData();
    const childrenData = useMemo(() => users.filter(u => parentUser.childIds.includes(u.id)) as Student[], [users, parentUser.childIds]);
    const parentAccounts = useMemo(() => users.filter(u => u.role === UserRole.Parent) as Parent[], [users]);
  
  const [selectedChildId, setSelectedChildId] = useState(childrenData[0]?.id || '');
  const [selectedParentAccountId, setSelectedParentAccountId] = useState(parentUser.id);
  const [switchFeedback, setSwitchFeedback] = useState('');
  
  useEffect(() => {
    setSelectedParentAccountId(parentUser.id);
  }, [parentUser.id]);
  
  const handleSwitchAccount = () => {
    if (selectedParentAccountId === parentUser.id) {
        setSwitchFeedback('You are already using this account.');
        return;
    }
    const target = parentAccounts.find(acc => acc.id === selectedParentAccountId);
    if (target) {
        setSwitchFeedback(`Switch to ${target.name} by signing in with their Unique ID when prompted.`);
    } else {
        setSwitchFeedback('Selected account is no longer available.');
    }
  };
  
  const selectedChild = childrenData.find(c => c.id === selectedChildId);

  // Parent dashboard is simpler, so we can use a static nav item and just change content
  const [activeItem, setActiveItem] = useState('Dashboard');
    const navItems = [
        { name: 'Dashboard', icon: <span className="w-6 h-6 inline-block" /> },
        { name: 'Profile', icon: <span className="w-6 h-6 inline-block" /> },
    ];

    const renderContent = () => {
        if (activeItem === 'Profile') {
            return <ProfileView />;
        }

        return (
            <>
                <Card className="mb-6">
                    <div className="space-y-3">
                        <div>
                            <h3 className="font-bold text-lg">Switch Account</h3>
                            <p className="text-sm text-[rgb(var(--text-secondary-color))]">
                                Manage multiple parent accounts and jump between them without losing context.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={selectedParentAccountId}
                                onChange={(e) => setSelectedParentAccountId(e.target.value)}
                                className="flex-1 bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary-color))]"
                            >
                                {parentAccounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                            <Button type="button" onClick={handleSwitchAccount} className="sm:w-auto w-full">
                                Switch Account
                            </Button>
                        </div>
                        <p className="text-xs text-[rgb(var(--text-secondary-color))]">
                            Switching will require authentication with the selected account's Unique ID for security.
                        </p>
                        {switchFeedback && (
                            <p className="text-sm text-[rgb(var(--primary-color))]">{switchFeedback}</p>
                        )}
                    </div>
                </Card>
                {childrenData.length > 1 && (
                    <ChildSwitcher 
                        childrenData={childrenData} 
                        selectedChildId={selectedChildId} 
                        setSelectedChildId={setSelectedChildId} 
                    />
                )}
                {selectedChild ? (
                    <ParentDashboardContent child={selectedChild} />
                ) : (
                    <Card><p>No child selected or data not found.</p></Card>
                )}
            </>
        );
    };

  return (
    <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem} profileNavItemName="Profile">
      {renderContent()}
    </Layout>
  );
};

export default ParentDashboard;
