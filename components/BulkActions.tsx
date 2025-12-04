import React from 'react';
import Button from './ui/Button';

interface BulkActionsProps {
    selectedCount: number;
    onDelete: () => void;
    onExport: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedCount, onDelete, onExport }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg border border-gray-200 rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-fade-in-up">
            <span className="font-semibold text-gray-700">{selectedCount} users selected</span>
            <div className="h-4 w-px bg-gray-300 mx-2"></div>
            <Button size="sm" variant="danger" onClick={onDelete}>Delete Selected</Button>
            <Button size="sm" variant="outline" onClick={onExport}>Export CSV</Button>
        </div>
    );
};

export default BulkActions;
