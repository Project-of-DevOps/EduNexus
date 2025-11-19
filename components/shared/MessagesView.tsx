
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, Message as MessageType } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';

const MessageBox: React.FC<{ onSend: (targetType: 'class' | 'department', targetId: string, content: string) => void }> = ({ onSend }) => {
    const { user } = useAuth();
    const { classes } = useData();
    const [target, setTarget] = useState('');
    const [content, setContent] = useState('');
    
    const userClasses = classes.filter(c => c.teacherIds.includes(user!.id));
    const userDepartment = (user as any).department;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!target || !content) return;
        const [type, id] = target.split(':');
        onSend(type as 'class' | 'department', id, content);
        setContent('');
        setTarget('');
    }

    return (
        <Card className="mb-6">
            <h3 className="text-xl font-bold mb-4">Send a New Message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select id="target" value={target} onChange={e => setTarget(e.target.value)} required>
                    <option value="">-- Select Target --</option>
                    {userClasses.map(c => <option key={c.id} value={`class:${c.id}`}>Class: {c.name}</option>)}
                    {userDepartment && <option value={`department:${userDepartment}`}>Department: {userDepartment}</option>}
                </Select>
                 <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] sm:text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-2.5"
                    placeholder="Your message..."
                    rows={4}
                    required
                ></textarea>
                <Button type="submit">Send Message</Button>
            </form>
        </Card>
    );
};

const Message: React.FC<{ message: MessageType }> = ({ message }) => {
    const { user } = useAuth();
    const { updateMessage } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(message.content);

    const canEdit = useMemo(() => {
        if (message.senderId !== user?.id) return false;
        const messageTime = new Date(message.timestamp).getTime();
        const now = Date.now();
        return (now - messageTime) < 15 * 60 * 1000; // 15 minutes
    }, [message, user]);

    const handleUpdate = () => {
        updateMessage(message.id, editedContent);
        setIsEditing(false);
    }
    
    return (
        <div className="p-4 rounded-lg bg-[rgb(var(--foreground-color))] shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold">{message.senderName}</p>
                    <p className="text-sm text-[rgb(var(--text-secondary-color))]">To: {message.targetType === 'class' ? 'Class' : 'Dept'} - {message.targetId}</p>
                </div>
                <span className="text-xs text-[rgb(var(--text-secondary-color))]">{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            {isEditing ? (
                 <div className="mt-2">
                    <textarea 
                        value={editedContent} 
                        onChange={e => setEditedContent(e.target.value)}
                        className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] sm:text-sm rounded-lg block w-full p-2.5"
                        rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                        <Button onClick={handleUpdate} size="sm">Save</Button>
                        <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm">Cancel</Button>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-[rgb(var(--text-color))] whitespace-pre-wrap">{message.content}</p>
            )}
            {!isEditing && canEdit && (
                <div className="text-right mt-2">
                    <button onClick={() => setIsEditing(true)} className="text-xs text-[rgb(var(--primary-color))] hover:underline">Edit</button>
                </div>
            )}
        </div>
    )
}

const MessagesView: React.FC = () => {
    const { user } = useAuth();
    const { messages, addMessage, classes } = useData();

    const relevantMessages = useMemo(() => {
        if (!user) return [];
        return messages.filter(msg => {
            if (user.role === UserRole.Student) {
                const studentClass = classes.find(c => c.studentIds.includes(user.id));
                return msg.targetType === 'class' && msg.targetId === studentClass?.id;
            }
            if (user.role === UserRole.Parent) {
                 const childClasses = classes.filter(c => (user as any).childIds.some((childId: string) => c.studentIds.includes(childId)));
                 return msg.targetType === 'class' && childClasses.some(c => c.id === msg.targetId);
            }
            if (user.role === UserRole.Teacher || user.role === UserRole.Dean) {
                const teacherClasses = classes.filter(c => c.teacherIds.includes(user.id));
                return (msg.targetType === 'department' && msg.targetId === (user as any).department) ||
                       (msg.targetType === 'class' && teacherClasses.some(c => c.id === msg.targetId));
            }
            return false;
        });
    }, [user, messages, classes]);

    const handleSend = (targetType: 'class' | 'department', targetId: string, content: string) => {
        if (!user) return;
        addMessage({ senderId: user.id, senderName: user.name, targetType, targetId, content });
    };

    return (
        <div className="space-y-6">
            {(user?.role === UserRole.Teacher || user?.role === UserRole.Dean) && <MessageBox onSend={handleSend} />}
            <h2 className="text-2xl font-bold">Messages</h2>
            <div className="space-y-4">
                {relevantMessages.length > 0 ? (
                    relevantMessages.map(msg => <Message key={msg.id} message={msg} />)
                ) : (
                    <p>No messages for you yet.</p>
                )}
            </div>
        </div>
    );
};

export default MessagesView;
