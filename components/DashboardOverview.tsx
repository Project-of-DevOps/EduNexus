import React from 'react';
import Card from './ui/Card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardOverviewProps {
    stats: {
        totalTeachers: number;
        totalStudents: number;
        totalClasses: number;
        activeUsers: number;
    };
    roleDistribution: { name: string; value: number }[];
    departmentDistribution: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, roleDistribution, departmentDistribution }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-l-4 border-blue-500">
                    <h4 className="text-sm font-bold uppercase text-[rgb(var(--text-secondary-color))]">Total Teachers</h4>
                    <p className="text-4xl font-black text-blue-500 mt-2">{stats.totalTeachers}</p>
                </Card>
                <Card className="p-6 border-l-4 border-green-500">
                    <h4 className="text-sm font-bold uppercase text-[rgb(var(--text-secondary-color))]">Total Students</h4>
                    <p className="text-4xl font-black text-green-500 mt-2">{stats.totalStudents}</p>
                </Card>
                <Card className="p-6 border-l-4 border-yellow-500">
                    <h4 className="text-sm font-bold uppercase text-[rgb(var(--text-secondary-color))]">Classes</h4>
                    <p className="text-4xl font-black text-yellow-500 mt-2">{stats.totalClasses}</p>
                </Card>
                <Card className="p-6 border-l-4 border-purple-500">
                    <h4 className="text-sm font-bold uppercase text-[rgb(var(--text-secondary-color))]">Active Users</h4>
                    <p className="text-4xl font-black text-purple-500 mt-2">{stats.activeUsers}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 h-80 flex flex-col">
                    <h4 className="text-lg font-bold mb-4">User Distribution by Role</h4>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={roleDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {roleDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 h-80 flex flex-col">
                    <h4 className="text-lg font-bold mb-4">Teachers per Department</h4>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departmentDistribution}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;
