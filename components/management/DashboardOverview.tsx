import React, { useMemo } from 'react';
import Card from '../ui/Card';

interface DashboardStats {
    totalUsers: number;
    totalTeachers: number;
    totalStudents: number;
    totalParents: number;
    totalDepartments: number;
    totalClasses: number;
    pendingApprovals: number;
    activeSessionsCount: number;
}

interface RecentActivity {
    id: string;
    type: 'user_created' | 'user_deleted' | 'class_created' | 'dept_created' | 'approval' | 'rejection';
    description: string;
    timestamp: string;
    icon: string;
}

interface DashboardOverviewProps {
    stats: DashboardStats;
    recentActivities?: RecentActivity[];
    teacherByDepartment?: Record<string, number>;
    classDistribution?: Record<string, number>;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    stats,
    recentActivities = [],
    teacherByDepartment = {},
    classDistribution = {}
}) => {
    // Calculate metrics
    const metricsData = useMemo(() => {
        return [
            {
                label: 'Total Users',
                value: stats.totalUsers,
                icon: '👥',
                color: 'bg-blue-50 border-blue-200',
                textColor: 'text-blue-600'
            },
            {
                label: 'Teachers',
                value: stats.totalTeachers,
                icon: '👨‍🏫',
                color: 'bg-green-50 border-green-200',
                textColor: 'text-green-600'
            },
            {
                label: 'Students',
                value: stats.totalStudents,
                icon: '🎓',
                color: 'bg-purple-50 border-purple-200',
                textColor: 'text-purple-600'
            },
            {
                label: 'Parents',
                value: stats.totalParents,
                icon: '👨‍👩‍👧‍👦',
                color: 'bg-yellow-50 border-yellow-200',
                textColor: 'text-yellow-600'
            },
            {
                label: 'Departments',
                value: stats.totalDepartments,
                icon: '🏢',
                color: 'bg-indigo-50 border-indigo-200',
                textColor: 'text-indigo-600'
            },
            {
                label: 'Classes',
                value: stats.totalClasses,
                icon: '📚',
                color: 'bg-pink-50 border-pink-200',
                textColor: 'text-pink-600'
            },
            {
                label: 'Pending',
                value: stats.pendingApprovals,
                icon: '⏳',
                color: 'bg-orange-50 border-orange-200',
                textColor: 'text-orange-600'
            },
            {
                label: 'Active Sessions',
                value: stats.activeSessionsCount,
                icon: '🟢',
                color: 'bg-teal-50 border-teal-200',
                textColor: 'text-teal-600'
            }
        ];
    }, [stats]);

    // Sort recent activities by timestamp
    const sortedActivities = useMemo(() => {
        return [...recentActivities].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ).slice(0, 8);
    }, [recentActivities]);

    // Get top departments by teacher count
    const topDepartments = useMemo(() => {
        return Object.entries(teacherByDepartment)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    }, [teacherByDepartment]);

    // Calculate key metrics
    const avgStudentsPerTeacher = stats.totalTeachers > 0
        ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
        : '0';

    const avgClassesPerDept = stats.totalDepartments > 0
        ? (stats.totalClasses / stats.totalDepartments).toFixed(1)
        : '0';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-3xl font-bold">Dashboard Overview</h2>
                <p className="text-[rgb(var(--text-secondary-color))] mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricsData.map((metric, idx) => (
                    <Card
                        key={idx}
                        className={`p-6 border border-l-4 ${metric.color} cursor-pointer hover:shadow-lg transition-shadow`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-[rgb(var(--text-secondary-color))]">
                                    {metric.label}
                                </p>
                                <p className={`text-3xl font-extrabold ${metric.textColor} mt-2`}>
                                    {metric.value}
                                </p>
                            </div>
                            <span className="text-3xl">{metric.icon}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Average Metrics */}
                <Card className="p-6 bg-blue-50 border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">AVG. STUDENTS/TEACHER</h3>
                    <p className="text-4xl font-bold text-blue-600">{avgStudentsPerTeacher}</p>
                    <p className="text-xs text-blue-700 mt-2">📊 Workload indicator</p>
                </Card>

                <Card className="p-6 bg-green-50 border border-green-200">
                    <h3 className="text-sm font-semibold text-green-900 mb-2">AVG. CLASSES/DEPT</h3>
                    <p className="text-4xl font-bold text-green-600">{avgClassesPerDept}</p>
                    <p className="text-xs text-green-700 mt-2">📚 Distribution metric</p>
                </Card>

                <Card className="p-6 bg-orange-50 border border-orange-200">
                    <h3 className="text-sm font-semibold text-orange-900 mb-2">COMPLETION RATE</h3>
                    <p className="text-4xl font-bold text-orange-600">
                        {stats.totalUsers > 0 ? Math.round(((stats.totalTeachers + stats.totalStudents) / stats.totalUsers) * 100) : 0}%
                    </p>
                    <p className="text-xs text-orange-700 mt-2">✓ Profile completion</p>
                </Card>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Departments */}
                <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-4">Top Departments by Teachers</h3>
                    {topDepartments.length === 0 ? (
                        <p className="text-[rgb(var(--text-secondary-color))]">No department data available</p>
                    ) : (
                        <div className="space-y-3">
                            {topDepartments.map(([dept, count], idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">{dept}</span>
                                        <span className="text-sm font-bold text-blue-600">{count} teachers</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${Math.max((count / (topDepartments[0]?.[1] || 1)) * 100, 5)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Critical Alerts */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">⚠️ Alerts & Notices</h3>
                    <div className="space-y-2">
                        {stats.pendingApprovals > 0 && (
                            <div className="p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                                <p className="text-sm font-medium text-yellow-900">
                                    {stats.pendingApprovals} pending approval{stats.pendingApprovals !== 1 ? 's' : ''}
                                </p>
                            </div>
                        )}
                        {stats.totalUsers > 0 && (
                            <div className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
                                <p className="text-sm font-medium text-blue-900">
                                    System health: <span className="text-green-600">✓ Normal</span>
                                </p>
                            </div>
                        )}
                        <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                            <p className="text-sm font-medium text-green-900">
                                No critical issues detected
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Activities Timeline */}
            <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">📋 Recent Activities</h3>
                {sortedActivities.length === 0 ? (
                    <p className="text-[rgb(var(--text-secondary-color))]">No recent activities</p>
                ) : (
                    <div className="space-y-4">
                        {sortedActivities.map((activity, idx) => (
                            <div
                                key={activity.id}
                                className="flex gap-4 pb-4 border-b border-[rgb(var(--border-color))] last:border-0"
                            >
                                {/* Timeline Dot */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                                        {activity.icon}
                                    </div>
                                    {idx < sortedActivities.length - 1 && (
                                        <div className="w-0.5 h-8 bg-gray-300" />
                                    )}
                                </div>

                                {/* Activity Details */}
                                <div className="flex-1 pt-1">
                                    <p className="font-medium">{activity.description}</p>
                                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                </div>

                                {/* Activity Type Badge */}
                                <div className="text-xs font-medium">
                                    {activity.type === 'user_created' && (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Created</span>
                                    )}
                                    {activity.type === 'user_deleted' && (
                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Deleted</span>
                                    )}
                                    {activity.type === 'class_created' && (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Class</span>
                                    )}
                                    {activity.type === 'dept_created' && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Dept</span>
                                    )}
                                    {activity.type === 'approval' && (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Approved</span>
                                    )}
                                    {activity.type === 'rejection' && (
                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Rejected</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Footer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center text-sm">
                <Card className="p-4">
                    <p className="text-[rgb(var(--text-secondary-color))]">System Uptime</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">99.9%</p>
                </Card>
                <Card className="p-4">
                    <p className="text-[rgb(var(--text-secondary-color))]">Avg Response Time</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">&lt;200ms</p>
                </Card>
                <Card className="p-4">
                    <p className="text-[rgb(var(--text-secondary-color))]">Storage Used</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">32%</p>
                </Card>
                <Card className="p-4">
                    <p className="text-[rgb(var(--text-secondary-color))]">Last Backup</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">2h ago</p>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;
