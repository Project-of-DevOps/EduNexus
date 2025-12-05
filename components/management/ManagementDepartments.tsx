import React from 'react';

interface ManagementDepartmentsProps {
  departments?: any[];
  onDepartmentAction?: (action: string, deptId: string) => void;
}

const ManagementDepartments: React.FC<ManagementDepartmentsProps> = ({ departments = [], onDepartmentAction }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Department Management</h2>
      <div className="text-gray-500">Departments: {departments.length}</div>
    </div>
  );
};

export default ManagementDepartments;
