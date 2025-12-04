import React, { useState, useEffect } from 'react';
import Input from './ui/Input';
import Button from './ui/Button';

interface UserSearchFilterProps {
    onSearch: (query: string, filters: any) => void;
    roles: string[];
    departments: string[];
}

const UserSearchFilter: React.FC<UserSearchFilterProps> = ({ onSearch, roles, departments }) => {
    const [query, setQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDept, setSelectedDept] = useState('');

    const handleSearch = () => {
        onSearch(query, { role: selectedRole, department: selectedDept });
    };

    const handleClear = () => {
        setQuery('');
        setSelectedRole('');
        setSelectedDept('');
        onSearch('', { role: '', department: '' });
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex-1">
                <Input
                    id="search-users"
                    label=""
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="w-full md:w-48">
                <select
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                >
                    <option value="">All Roles</option>
                    {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>
            <div className="w-full md:w-48">
                <select
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleSearch}>Search</Button>
                <Button variant="outline" onClick={handleClear}>Clear</Button>
            </div>
        </div>
    );
};

export default UserSearchFilter;
