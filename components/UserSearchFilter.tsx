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
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-[rgb(var(--surface-color))] rounded-lg shadow-sm border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))]">
            <div className="flex-1">
                <Input
                    id="search-users"
                    label=""
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full border-2 border-[rgb(var(--primary-color))] shadow-md focus:ring-2 focus:ring-[rgb(var(--primary-color))] transition-all duration-200"
                    leftElement={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgb(var(--primary-color))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    }
                />
            </div>
            <div className="w-full md:w-48">
                <select
                    className="w-full p-2 border border-[rgb(var(--border-color))] rounded-md bg-[rgb(var(--subtle-background-color))] text-[rgb(var(--text-color))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring-color))]"
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
                    className="w-full p-2 border border-[rgb(var(--border-color))] rounded-md bg-[rgb(var(--subtle-background-color))] text-[rgb(var(--text-color))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring-color))]"
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
                <Button variant="outline" onClick={handleClear} className="font-extrabold text-[rgb(var(--highlight-color))] border-[rgb(var(--highlight-color))] hover:bg-[rgba(var(--highlight-color),0.2)]">Clear</Button>
            </div>
        </div>
    );
};

export default UserSearchFilter;
