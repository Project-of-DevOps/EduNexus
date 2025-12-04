import React, { useState, useMemo } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { UserRole } from '../../types';

interface FilterUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    status?: string;
    instituteId?: string;
}

interface UserSearchFilterProps {
    users: FilterUser[];
    onSelectUsers?: (users: FilterUser[]) => void;
    onUserClick?: (user: FilterUser) => void;
    allowMultiSelect?: boolean;
}

const UserSearchFilter: React.FC<UserSearchFilterProps> = ({ 
    users, 
    onSelectUsers, 
    onUserClick,
    allowMultiSelect = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    // Get unique departments and statuses from users
    const uniqueDepartments = useMemo(() => {
        return Array.from(new Set(users
            .map(u => u.department)
            .filter(Boolean) as string[]
        )).sort();
    }, [users]);

    const uniqueStatuses = useMemo(() => {
        return Array.from(new Set(users
            .map(u => u.status || 'active')
            .filter(Boolean) as string[]
        )).sort();
    }, [users]);

    // Apply all filters
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Search term filter (name, email, ID)
            if (searchTerm.trim()) {
                const lowerSearch = searchTerm.toLowerCase();
                const matchesSearch = 
                    user.name.toLowerCase().includes(lowerSearch) ||
                    user.email.toLowerCase().includes(lowerSearch) ||
                    user.id.toLowerCase().includes(lowerSearch);
                if (!matchesSearch) return false;
            }

            // Role filter
            if (roleFilter && user.role !== roleFilter) return false;

            // Department filter
            if (departmentFilter && user.department !== departmentFilter) return false;

            // Status filter
            if (statusFilter && (user.status || 'active') !== statusFilter) return false;

            return true;
        });
    }, [users, searchTerm, roleFilter, departmentFilter, statusFilter]);

    const handleToggleUser = (userId: string) => {
        if (!allowMultiSelect) return;
        
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
        
        // Call callback with selected users
        if (onSelectUsers) {
            const selected = users.filter(u => newSelected.has(u.id));
            onSelectUsers(selected);
        }
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
            if (onSelectUsers) onSelectUsers([]);
        } else {
            const allIds = new Set(filteredUsers.map(u => u.id));
            setSelectedUsers(allIds);
            if (onSelectUsers) onSelectUsers(filteredUsers);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setRoleFilter('');
        setDepartmentFilter('');
        setStatusFilter('');
        setSelectedUsers(new Set());
    };

    const hasActiveFilters = searchTerm || roleFilter || departmentFilter || statusFilter || selectedUsers.size > 0;

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <Input
                        id="userSearch"
                        placeholder="Search by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <Button 
                    variant={showFilters ? 'primary' : 'secondary'}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <Card className="p-4 bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Role Filter */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Role</label>
                            <select
                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                            >
                                <option value="">All Roles</option>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="parent">Parent</option>
                                <option value="management">Management</option>
                                <option value="librarian">Librarian</option>
                            </select>
                        </div>

                        {/* Department Filter */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Department</label>
                            <select
                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                {uniqueDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                className="w-full bg-[rgb(var(--foreground-color))] border border-[rgb(var(--border-color))] rounded-md p-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {uniqueStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-end">
                            <Button 
                                variant="secondary" 
                                onClick={handleClearFilters}
                                className="w-full"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Results Summary */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-[rgb(var(--text-secondary-color))]">
                    Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
                    {hasActiveFilters && ' (filtered)'}
                </span>
                {allowMultiSelect && (
                    <div className="flex gap-2 items-center">
                        <span className="text-[rgb(var(--text-secondary-color))]">
                            {selectedUsers.size} selected
                        </span>
                        <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={handleSelectAll}
                        >
                            {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                )}
            </div>

            {/* User Results */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                    <Card className="p-6 text-center">
                        <p className="text-[rgb(var(--text-secondary-color))]">No users found matching your criteria</p>
                    </Card>
                ) : (
                    filteredUsers.map(user => (
                        <Card 
                            key={user.id}
                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-[rgb(var(--subtle-background-color))] transition-colors ${
                                allowMultiSelect && selectedUsers.has(user.id) 
                                    ? 'border-2 border-blue-500 bg-blue-50' 
                                    : ''
                            }`}
                            onClick={() => {
                                if (allowMultiSelect) {
                                    handleToggleUser(user.id);
                                } else if (onUserClick) {
                                    onUserClick(user);
                                }
                            }}
                        >
                            {allowMultiSelect && (
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.has(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                    className="mr-3"
                                />
                            )}
                            <div className="flex-1">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-[rgb(var(--text-secondary-color))]">{user.email}</p>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {user.role}
                                </span>
                                {user.department && (
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                        {user.department}
                                    </span>
                                )}
                                {user.status && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        user.status === 'active' 
                                            ? 'bg-green-100 text-green-800'
                                            : user.status === 'suspended'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {user.status}
                                    </span>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default UserSearchFilter;
