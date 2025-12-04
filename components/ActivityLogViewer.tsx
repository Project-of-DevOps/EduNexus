import React, { useState, useEffect } from 'react';
import Card from './ui/Card';

interface ActivityLog {
    id: number;
    action: string;
    details: string;
    userId: number;
    userEmail: string;
    createdAt: string;
}

interface ActivityLogViewerProps {
    logs: ActivityLog[];
    isLoading?: boolean;
}

const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({ logs, isLoading = false }) => {
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">Loading activity logs...</div>;
    }

    return (
        <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {logs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No recent activity recorded.</p>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">{log.action}</p>
                                <p className="text-xs text-gray-500">{log.details} • by {log.userEmail}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export default ActivityLogViewer;
