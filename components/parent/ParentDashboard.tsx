
import React, { useState, useMemo } from 'react';
import Layout from '../Layout';
import Card from '../ui/Card';
import AttendanceBarChart from '../charts/AttendanceBarChart';
import SubjectPieChart from '../charts/SubjectPieChart';
import { useAuth } from '../../hooks/useAuth';
import { mockUsers, mockMarks, mockAttendance, mockAnnouncements } from '../../data/mock';
import { Parent, Student, Mark, AttendanceRecord } from '../../types';
import { ATTENDANCE_THRESHOLD } from '../../constants';


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
    const childMarks = useMemo(() => mockMarks.filter(m => m.studentId === child.id), [child.id]);
    const childAttendance = useMemo(() => mockAttendance.filter(a => a.studentId === child.id), [child.id]);

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
                        {mockAnnouncements.map(ann => (
                            <li key={ann.id} className="text-sm p-2 rounded bg-[rgba(var(--primary-color),0.1)]">
                                <strong>{ann.teacherName}:</strong> {ann.content}
                            </li>
                        ))}
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
  
  const childrenData = useMemo(() => 
    mockUsers.filter(u => parentUser.childIds.includes(u.id)) as Student[],
    [parentUser.childIds]
  );
  
  const [selectedChildId, setSelectedChildId] = useState(childrenData[0]?.id || '');
  
  const selectedChild = childrenData.find(c => c.id === selectedChildId);

  // Parent dashboard is simpler, so we can use a static nav item and just change content
  const [activeItem, setActiveItem] = useState('Dashboard');
  const navItems = [
    { name: 'Dashboard', icon: <Icon path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.512 2.72a3 3 0 01-4.682-2.72 9.094 9.094 0 013.741-.479m-4.26 9.574a4.5 4.5 0 01-.223-1.99a4.5 4.5 0 01.223-1.99m13.486 0a4.5 4.5 0 00-.223-1.99a4.5 4.5 0 00.223-1.99m-13.486 0a4.5 4.5 0 00.223 1.99" /> },
  ];

  return (
    <Layout navItems={navItems} activeItem={activeItem} setActiveItem={setActiveItem}>
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
    </Layout>
  );
};

export default ParentDashboard;
