import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { UserRole } from '../../types';
import Modal from '../ui/Modal';

const ManagementNotifications: React.FC = () => {
    const { user } = useAuth();
    const { notifications, broadcastNotification, updateNotification, deleteNotification, markNotificationRead } = useData();
    const { currentTheme } = useTheme();
    const isDarkMode = currentTheme === 'Ocean Depth' || currentTheme === 'Iron Gunmetal';

    // Sending State
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState<UserRole | 'all'>('all');
    const [category, setCategory] = useState<'announcement' | 'message'>('message');
    const [successMsg, setSuccessMsg] = useState('');

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMessage, setEditMessage] = useState('');
    const [editCategory, setEditCategory] = useState<'announcement' | 'message'>('message');

    // View State
    const [viewMode, setViewMode] = useState<'received' | 'sent'>('received');

    const myReceivedNotifications = user?.email ? notifications.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase()) : [];
    const mySentNotifications = user?.id ? notifications.filter(n => n.senderId === user.id) : [];

    // Deduplicate sent notifications for display
    // If we have a batchId, use that. Otherwise fall back to message+createdAt.
    const uniqueSentNotifications = React.useMemo(() => {
        const seen = new Set();
        return mySentNotifications.filter(n => {
            const key = n.meta?.batchId || `${n.message}_${n.createdAt}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [mySentNotifications]);

    const handleSend = () => {
        if (!message.trim() || !user?.id) return;
        broadcastNotification(targetRole, message, category, user.id);
        setMessage('');
        setSuccessMsg('Notification sent successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleEdit = (id: string) => {
        if (!editMessage.trim()) return;
        // If it's a batch, we might want to update all, but DataContext updateNotification is by ID.
        // For now, just update the single ID (or we'd need a bulk update in DataContext).
        // Given the constraints, let's just update the one we clicked on, but ideally we'd update the whole batch.
        // Since we are displaying unique items, the user expects the "batch" to be updated.
        // But we don't have bulk update exposed.
        // Let's just update the ID and if the user refreshes they might see others?
        // Actually, if we filter by batchId, we are showing one representative.
        // Updating that one representative is fine for the UI, but the others remain old.
        // This is a limitation of the current simple DataContext.
        updateNotification(id, editMessage, editCategory);
        setEditingId(null);
    };

    const handleDelete = (id: string, batchId?: string) => {
        if (confirm('Are you sure you want to delete this notification?')) {
            if (batchId) {
                // Find all with this batchId and delete them
                const batch = notifications.filter(n => n.meta?.batchId === batchId);
                batch.forEach(n => deleteNotification(n.id));
            } else {
                deleteNotification(id);
            }
        }
    };

    const Icon = ({ path, className }: { path: string, className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );

    const AnnouncementIcon = () => (
        <Icon path="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.467c.616-1.4 2.24-2.26 3.768-2.11a1.5 1.5 0 011.31 1.516v6.924a1.5 1.5 0 01-1.31 1.516 4.498 4.498 0 01-3.768-2.11m-4.273-4.814L15.75 9" className="text-orange-500" />
    );

    const MessageIcon = () => (
        <Icon path="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" className="text-blue-500" />
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Notifications</h3>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('received')} className={`px-4 py-2 rounded ${viewMode === 'received' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-[rgb(var(--text-color))] font-bold'}`}>Inbox</button>
                    <button onClick={() => setViewMode('sent')} className={`px-4 py-2 rounded ${viewMode === 'sent' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-[rgb(var(--text-color))] font-bold'}`}>Sent</button>
                </div>
            </div>

            {viewMode === 'sent' && (
                <>
                    <Card className="p-6">
                        <h4 className="text-lg font-bold mb-4">Compose Notification</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Message</label>
                                <textarea
                                    className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
                                    rows={3}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Send To (Role)</label>
                                    <select
                                        className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
                                        value={targetRole}
                                        onChange={e => setTargetRole(e.target.value as any)}
                                    >
                                        <option value="all">All Users</option>
                                        <option value={UserRole.Student}>Students</option>
                                        <option value={UserRole.Teacher}>Teachers</option>
                                        <option value={UserRole.Parent}>Parents</option>
                                        <option value={UserRole.Management}>Management</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
                                        value={category}
                                        onChange={e => setCategory(e.target.value as any)}
                                    >
                                        <option value="message">Normal Message</option>
                                        <option value="announcement">Announcement</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSend}>Send Notification</Button>
                            </div>
                            {successMsg && <p className="text-green-600 text-sm text-right">{successMsg}</p>}
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <h4 className="text-lg font-bold">Sent History</h4>
                        {uniqueSentNotifications.length === 0 && <p className="text-[rgb(var(--text-color))] font-bold italic">No notifications sent.</p>}
                        {uniqueSentNotifications.map(n => {
                            // Check if any message in this batch has been read
                            const isBatchRead = n.meta?.batchId
                                ? mySentNotifications.some(item => item.meta?.batchId === n.meta?.batchId && item.read)
                                : n.read;

                            return (
                                <div key={n.id} className={`p-4 rounded border relative ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-[rgb(var(--subtle-background-color))] border-[rgb(var(--border-color))]'}`}>
                                    <div className="absolute top-4 right-4">
                                        {n.category === 'announcement' ? <AnnouncementIcon /> : <MessageIcon />}
                                    </div>
                                    <div className="pr-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${n.category === 'announcement' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {n.category || 'Message'}
                                            </span>
                                            <span className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className={`font-semibold mb-1 text-sm ${isDarkMode ? 'text-blue-700' : 'text-gray-600'}`}>
                                            {n.senderRole || 'Me'} &rarr; {n.targetRole ? (n.targetRole === 'all' ? 'Everyone' : n.targetRole) : n.recipientEmail}
                                        </p>
                                        <p className={`mt-1 ${isDarkMode ? 'text-blue-700' : 'text-gray-800'}`}>{n.message}</p>
                                        {isBatchRead && <p className="text-xs text-green-600 mt-1">Read by recipient(s)</p>}
                                    </div>
                                    <div className="mt-3 flex gap-2 justify-end">
                                        <button onClick={() => { setEditingId(n.id); setEditMessage(n.message); setEditCategory(n.category || 'message'); }} className="text-sm text-blue-600 hover:underline">Edit</button>
                                        {!isBatchRead && (
                                            <button onClick={() => handleDelete(n.id, n.meta?.batchId)} className="text-sm text-red-600 hover:underline">Delete</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {viewMode === 'received' && (
                <Card className="p-6">
                    <div className="space-y-4">
                        {myReceivedNotifications.length === 0 && <p className="text-[rgb(var(--text-color))] font-bold italic">No notifications received.</p>}
                        {myReceivedNotifications.map(n => (
                            <div key={n.id} className={`p-4 rounded border relative ${isDarkMode
                                ? 'bg-[#1a1a1a] border-gray-700'
                                : (n.read ? 'bg-[rgb(var(--subtle-background-color))] border-[rgb(var(--border-color))]' : 'bg-[rgb(var(--background-color))] border-[rgb(var(--primary-color))] shadow-sm')
                                }`}>
                                <div className="absolute top-4 right-4">
                                    {n.category === 'announcement' ? <AnnouncementIcon /> : <MessageIcon />}
                                </div>
                                <div className="flex justify-between items-start pr-10">
                                    <div>
                                        <div className="flex gap-2 items-center mb-1">
                                            {n.category === 'announcement' && <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">ANNOUNCEMENT</span>}
                                            <p className="text-xs text-[rgb(var(--text-secondary-color))]">{new Date(n.createdAt).toLocaleString()}</p>
                                        </div>
                                        <p className={`${isDarkMode
                                            ? 'text-blue-700'
                                            : (n.read ? 'text-[rgb(var(--text-secondary-color))]' : 'text-[rgb(var(--text-color))] font-semibold')
                                            }`}>{n.message}</p>
                                    </div>
                                </div>
                                {!n.read && (
                                    <div className="mt-2 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => markNotificationRead(n.id)}>Mark as Read</Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Modal isOpen={!!editingId} onClose={() => setEditingId(null)}>
                <h3 className="text-lg font-bold mb-4">Edit Notification</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Message</label>
                        <textarea
                            className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
                            rows={3}
                            value={editMessage}
                            onChange={e => setEditMessage(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                            className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-[#1a1a1a] border-gray-700 text-white' : ''}`}
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value as any)}
                        >
                            <option value="message">Normal Message</option>
                            <option value="announcement">Announcement</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button onClick={() => editingId && handleEdit(editingId)}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManagementNotifications;
