import React from 'react';

interface ManagementClassesProps {
  classes?: any[];
  onClassAction?: (action: string, classId: string) => void;
}

const ManagementClasses: React.FC<ManagementClassesProps> = ({ classes = [], onClassAction }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Class Management</h2>
      <div className="text-gray-500">Classes: {classes.length}</div>
    </div>
  );
};

export default ManagementClasses;
