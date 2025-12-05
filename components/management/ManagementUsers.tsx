import React from 'react';

interface ManagementUsersProps {
  users?: any[];
  onUserAction?: (action: string, userId: string) => void;
}

const ManagementUsers: React.FC<ManagementUsersProps> = ({ users = [], onUserAction }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="text-gray-500">Users: {users.length}</div>
    </div>
  );
};

export default ManagementUsers;
