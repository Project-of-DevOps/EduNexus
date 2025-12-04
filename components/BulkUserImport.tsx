import React, { useState, useRef } from 'react';
import Button from './ui/Button';
import * as XLSX from 'xlsx';

interface BulkUserImportProps {
    onImport: (users: any[]) => void;
}

const BulkUserImport: React.FC<BulkUserImportProps> = ({ onImport }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            setError(null);
        }
    };

    const processFile = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                setError('File appears to be empty.');
                return;
            }

            onImport(jsonData);
            setFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
        }
    };

    return (
        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
            <h4 className="font-bold text-gray-700 mb-2">Bulk Import Users</h4>
            <p className="text-sm text-gray-500 mb-4">Upload a CSV or Excel file with columns: Name, Email, Role, Department (optional).</p>

            <div className="flex items-center gap-4">
                <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                    "
                />
                <Button onClick={processFile} disabled={!fileName}>Import</Button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

export default BulkUserImport;
