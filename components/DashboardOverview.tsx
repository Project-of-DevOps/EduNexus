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
                    <h4 className="text-sm font-bold text-gray-500 uppercase">Total Teachers</h4>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.totalTeachers}</p>
                </Card>
                <Card className="p-6 border-l-4 border-green-500">
                    <h4 className="text-sm font-bold text-gray-500 uppercase">Total Students</h4>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.totalStudents}</p>
                </Card>
                <Card className="p-6 border-l-4 border-yellow-500">
                    <h4 className="text-sm font-bold text-gray-500 uppercase">Classes</h4>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.totalClasses}</p>
                </Card>
                <Card className="p-6 border-l-4 border-purple-500">
                    <h4 className="text-sm font-bold text-gray-500 uppercase">Active Users</h4>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">{stats.activeUsers}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 h-80">
                    <h4 className="text-lg font-bold mb-4">User Distribution by Role</h4>
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
                </Card>

                <Card className="p-6 h-80">
                    <h4 className="text-lg font-bold mb-4">Teachers per Department</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default DashboardOverview;
