import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ATTENDANCE_THRESHOLD } from '../../constants';

interface ChartData {
  name: string;
  attendance: number;
}

interface AttendanceBarChartProps {
  data: ChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[rgb(var(--foreground-color))] p-2 border border-[rgb(var(--border-color))] rounded-lg shadow-lg">
        <p className="font-bold text-[rgb(var(--text-color))]">{label}</p>
        <p className="text-[rgb(var(--primary-color))]">{`Attendance: ${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};


const AttendanceBarChart: React.FC<AttendanceBarChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
        <XAxis dataKey="name" stroke="rgb(var(--text-secondary-color))" />
        <YAxis unit="%" stroke="rgb(var(--text-secondary-color))" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="attendance" name="Attendance (%)">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.attendance < ATTENDANCE_THRESHOLD ? '#ef4444' : 'rgb(var(--primary-color))'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceBarChart;