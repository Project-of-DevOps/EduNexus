import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface ActivityLogEntry {
    id: string;
    adminId: string;
    adminName?: string;
    action: string;
    targetUserId?: string;
    targetUserName?: string;
    resourceType: string;
    details?: any;
    ipAddress?: string;
    timestamp: string;
    status: 'success' | 'failed';
}

interface ActivityLogViewerProps {
    logs: ActivityLogEntry[];
    loading?: boolean;
    onLoadMore?: () => void;
}

const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({ logs, loading = false, onLoadMore }) => {
    const [filterAction, setFilterAction] = useState('');
    const [filterStatus, setFilterStatus] = useState<'success' | 'failed' | ''>('');
    const [filterDateRange, setFilterDateRange] = useState('7days'); // 7days, 30days, 90days, all
    const [searchTerm, setSearchTerm] = useState('');

    // Get unique actions from logs
    const uniqueActions = useMemo(() => {
        return Array.from(new Set(logs.map(log => log.action))).sort();
    }, [logs]);

    // Filter logs
    const filteredLogs = useMemo(() => {
        let filtered = [...logs];

        // Date range filter
        const now = new Date();
        const cutoffDate = new Date();

        switch (filterDateRange) {
            case '7days':
                cutoffDate.setDate(cutoffDate.getDate() - 7);
                break;
            case '30days':
                cutoffDate.setDate(cutoffDate.getDate() - 30);
                break;
            case '90days':
                cutoffDate.setDate(cutoffDate.getDate() - 90);
                break;
            case 'all':
            default:
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 100);
        }

        filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffDate);

        // Action filter
        if (filterAction) {
            filtered = filtered.filter(log => log.action === filterAction);
        }

        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(log => log.status === filterStatus);
        }

        // Search filter
        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(log =>
                log.adminName?.toLowerCase().includes(lowerSearch) ||
                log.targetUserName?.toLowerCase().includes(lowerSearch) ||
                log.action.toLowerCase().includes(lowerSearch) ||
                log.ipAddress?.includes(searchTerm)
            );
        }

        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, filterAction, filterStatus, filterDateRange, searchTerm]);

    const getActionColor = (action: string) => {
        if (action.includes('delete') || action.includes('remove')) return 'text-red-600';
        if (action.includes('create') || action.includes('add')) return 'text-green-600';
        if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
        if (action.includes('suspend') || action.includes('block')) return 'text-yellow-600';
        if (action.includes('approve') || action.includes('accept')) return 'text-green-600';
        if (action.includes('reject') || action.includes('deny')) return 'text-red-600';
        return 'text-gray-600';
    };

    const getActionIcon = (action: string) => {
        if (action.includes('delete')) return '🗑️';
        if (action.includes('create') || action.includes('add')) return '➕';
        if (action.includes('update') || action.includes('edit')) return '✏️';
        if (action.includes('suspend') || action.includes('block')) return '⛔';
        if (action.includes('approve')) return '✅';
        if (action.includes('reject')) return '❌';
        if (action.includes('view')) return '👁️';
        return '📋';
    };

    const getStatusBadgeColor = (status: string) => {
        return status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card className="p-4 bg-[rgb(var(--subtle-background-color))]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <Input
                            id="logSearch"
                            placeholder="Search by name, IP, or action..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Action</label>
                        <select
                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="">All Statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Time Period</label>
                        <select
                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                            value={filterDateRange}
                            onChange={(e) => setFilterDateRange(e.target.value)}
                        >
                            <option value="7days">Last 7 days</option>
                            <option value="30days">Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Results Summary */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-[rgb(var(--text-secondary-color))]">
                    Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> log entries
                </span>
            </div>

            {/* Logs Table */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                    <Card className="p-6 text-center">
                        <p className="text-[rgb(var(--text-secondary-color))]">No activity logs found matching your filters</p>
                    </Card>
                ) : (
                    filteredLogs.map(log => (
                        <Card key={log.id} className="p-4 hover:bg-[rgb(var(--subtle-background-color))] transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Time */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-[rgb(var(--text-secondary-color))]">TIME</span>
                                    <span className="font-mono text-sm">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>

                                {/* Admin */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-[rgb(var(--text-secondary-color))]">ADMIN</span>
                                    <span className="font-medium">{log.adminName || `Admin ${log.adminId}`}</span>
                                </div>

                                {/* Action */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-[rgb(var(--text-secondary-color))]">ACTION</span>
                                    <div className="flex items-center gap-2">
                                        <span>{getActionIcon(log.action)}</span>
                                        <span className={`font-medium ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </div>
                                </div>

                                {/* Target */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-[rgb(var(--text-secondary-color))]">TARGET</span>
                                    {log.targetUserName ? (
                                        <span className="text-sm">{log.targetUserName}</span>
                                    ) : log.resourceType ? (
                                        <span className="text-sm">{log.resourceType}</span>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="flex flex-col justify-between">
                                    <span className="text-xs font-semibold text-[rgb(var(--text-secondary-color))]">STATUS</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(log.status)}`}>
                                            {log.status === 'success' ? '✓' : '✗'} {log.status}
                                        </span>
                                        {log.ipAddress && (
                                            <span className="text-xs text-gray-500" title={log.ipAddress}>
                                                🌐 {log.ipAddress}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details Expansion */}
                            {log.details && (
                                <div className="mt-3 pt-3 border-t border-[rgb(var(--border-color))]">
                                    <details className="text-xs">
                                        <summary className="cursor-pointer font-medium text-blue-600 hover:underline">
                                            View Details
                                        </summary>
                                        <div className="mt-2 p-2 bg-[rgb(var(--subtle-background-color))] rounded font-mono">
                                            <pre className="whitespace-pre-wrap break-words">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Load More Button */}
            {onLoadMore && (
                <div className="flex justify-center">
                    <Button
                        variant="secondary"
                        onClick={onLoadMore}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ActivityLogViewer;
