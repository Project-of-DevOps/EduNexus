import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

interface BulkActionsProps {
    selectedCount: number;
    onBulkDelete?: () => Promise<void>;
    onBulkSuspend?: () => Promise<void>;
    onBulkActivate?: () => Promise<void>;
    onBulkResetPassword?: () => Promise<void>;
    onBulkChangeRole?: (newRole: string) => Promise<void>;
    onClearSelection?: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
    selectedCount,
    onBulkDelete,
    onBulkSuspend,
    onBulkActivate,
    onBulkResetPassword,
    onBulkChangeRole,
    onClearSelection
}) => {
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    if (selectedCount === 0) return null;

    const handleAction = async (action: string) => {
        setLoading(true);
        setActionMessage('');

        try {
            let result: any;
            switch (action) {
                case 'delete':
                    result = await onBulkDelete?.();
                    setActionMessage(`✅ Successfully deleted ${selectedCount} users`);
                    break;
                case 'suspend':
                    result = await onBulkSuspend?.();
                    setActionMessage(`✅ Successfully suspended ${selectedCount} users`);
                    break;
                case 'activate':
                    result = await onBulkActivate?.();
                    setActionMessage(`✅ Successfully activated ${selectedCount} users`);
                    break;
                case 'resetPassword':
                    result = await onBulkResetPassword?.();
                    setActionMessage(`✅ Sent password reset emails to ${selectedCount} users`);
                    break;
            }

            setShowConfirmation(false);
            setConfirmAction(null);

            // Clear selection after action
            setTimeout(() => {
                onClearSelection?.();
            }, 1500);
        } catch (error) {
            setActionMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeRole = async () => {
        if (!selectedRole) return;
        
        setLoading(true);
        setActionMessage('');

        try {
            await onBulkChangeRole?.(selectedRole);
            setActionMessage(`✅ Successfully changed role for ${selectedCount} users to ${selectedRole}`);
            setShowRoleModal(false);
            setSelectedRole('');

            // Clear selection after action
            setTimeout(() => {
                onClearSelection?.();
            }, 1500);
        } catch (error) {
            setActionMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const initiateAction = (action: string) => {
        setConfirmAction(action);
        setShowConfirmation(true);
    };

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <Card className="p-4 border-2 border-blue-500 bg-blue-50">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-blue-900">{selectedCount} user{selectedCount !== 1 ? 's' : ''} selected</p>
                        <p className="text-sm text-blue-700">Choose an action below</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => initiateAction('resetPassword')}
                            disabled={loading}
                        >
                            🔐 Reset Password
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => initiateAction('suspend')}
                            disabled={loading}
                        >
                            ⛔ Suspend
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => initiateAction('activate')}
                            disabled={loading}
                        >
                            ✅ Activate
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowRoleModal(true)}
                            disabled={loading}
                        >
                            👤 Change Role
                        </Button>

                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => initiateAction('delete')}
                            disabled={loading}
                        >
                            🗑️ Delete
                        </Button>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onClearSelection}
                            disabled={loading}
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {actionMessage && (
                    <div className={`mt-3 p-2 rounded text-sm ${
                        actionMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {actionMessage}
                    </div>
                )}
            </Card>

            {/* Confirmation Modal */}
            <Modal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">
                        Confirm Bulk Action
                    </h3>

                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                        <p className="text-sm text-yellow-800">
                            {confirmAction === 'delete' && `⚠️ You are about to DELETE ${selectedCount} user(s). This action cannot be undone.`}
                            {confirmAction === 'suspend' && `⚠️ You are about to SUSPEND ${selectedCount} user(s). They will not be able to log in.`}
                            {confirmAction === 'activate' && `Activating ${selectedCount} user(s). They will be able to log in.`}
                            {confirmAction === 'resetPassword' && `Sending password reset emails to ${selectedCount} user(s).`}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowConfirmation(false);
                                setConfirmAction(null);
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={confirmAction === 'delete' ? 'danger' : 'primary'}
                            onClick={() => confirmAction && handleAction(confirmAction)}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Confirm'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Role Change Modal */}
            <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)}>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Change Role for {selectedCount} User(s)</h3>

                    <div>
                        <label className="block text-sm font-medium mb-2">New Role</label>
                        <select
                            className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="">Select a role...</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="parent">Parent</option>
                            <option value="management">Management</option>
                            <option value="librarian">Librarian</option>
                        </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                        All selected users will be changed to the role: <strong>{selectedRole || '(not selected)'}</strong>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowRoleModal(false);
                                setSelectedRole('');
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangeRole}
                            disabled={!selectedRole || loading}
                        >
                            {loading ? 'Processing...' : 'Change Role'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BulkActions;
