import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

interface BulkUser {
    name: string;
    email: string;
    role: string;
    department?: string;
    phone?: string;
    status?: string;
}

interface BulkUserImportProps {
    onImport?: (users: BulkUser[]) => Promise<void>;
    onCancel?: () => void;
}

const BulkUserImport: React.FC<BulkUserImportProps> = ({ onImport, onCancel }) => {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedUsers, setParsedUsers] = useState<BulkUser[]>([]);
    const [uploadError, setUploadError] = useState('');
    const [importProgress, setImportProgress] = useState(0);
    const [importMessage, setImportMessage] = useState('');
    const [templateSampleUrl, setTemplateSampleUrl] = useState('');

    const CSV_TEMPLATE = `name,email,role,department,phone,status
John Doe,john@example.com,teacher,CSE,9876543210,active
Jane Smith,jane@example.com,student,CSE,9876543211,active
Bob Wilson,bob@example.com,parent,CSE,9876543212,active`;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setUploadError('Please select a CSV file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setUploadError('File size must be less than 5MB');
            return;
        }

        setCsvFile(file);
        setUploadError('');
        parseCSV(file);
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target?.result as string;
                const lines = csv.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    setUploadError('CSV must contain headers and at least one data row');
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const requiredHeaders = ['name', 'email', 'role'];
                
                const hasRequiredHeaders = requiredHeaders.every(req => 
                    headers.includes(req)
                );

                if (!hasRequiredHeaders) {
                    setUploadError(`CSV must contain these columns: ${requiredHeaders.join(', ')}`);
                    return;
                }

                const users: BulkUser[] = [];
                const errors: string[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const user: BulkUser = {
                        name: values[headers.indexOf('name')] || '',
                        email: values[headers.indexOf('email')] || '',
                        role: values[headers.indexOf('role')] || '',
                    };

                    // Optional fields
                    const deptIndex = headers.indexOf('department');
                    if (deptIndex !== -1) user.department = values[deptIndex];

                    const phoneIndex = headers.indexOf('phone');
                    if (phoneIndex !== -1) user.phone = values[phoneIndex];

                    const statusIndex = headers.indexOf('status');
                    if (statusIndex !== -1) user.status = values[statusIndex];

                    // Validation
                    if (!user.name || !user.email || !user.role) {
                        errors.push(`Row ${i + 1}: Missing required fields`);
                        continue;
                    }

                    if (!user.email.includes('@')) {
                        errors.push(`Row ${i + 1}: Invalid email format`);
                        continue;
                    }

                    const validRoles = ['student', 'teacher', 'parent', 'management', 'librarian'];
                    if (!validRoles.includes(user.role.toLowerCase())) {
                        errors.push(`Row ${i + 1}: Invalid role. Must be one of: ${validRoles.join(', ')}`);
                        continue;
                    }

                    users.push(user);
                }

                if (users.length === 0) {
                    setUploadError(`No valid users found. Errors: ${errors.join('; ')}`);
                    return;
                }

                setParsedUsers(users);
                setUploadError('');
                setStep('preview');

                if (errors.length > 0) {
                    setImportMessage(`⚠️ Warnings: ${errors.join('; ')}`);
                }
            } catch (err) {
                setUploadError(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const element = document.createElement('a');
        const file = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
        element.href = URL.createObjectURL(file);
        element.download = 'user_import_template.csv';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleImport = async () => {
        if (parsedUsers.length === 0) return;

        setStep('importing');
        setImportProgress(0);
        setImportMessage('Starting import...');

        try {
            if (onImport) {
                await onImport(parsedUsers);
            }

            // Simulate progress
            for (let i = 0; i <= 100; i += 10) {
                setImportProgress(i);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            setImportMessage(`✅ Successfully imported ${parsedUsers.length} users!`);
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                onCancel?.();
            }, 2000);
        } catch (error) {
            setImportMessage(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleRemoveUser = (index: number) => {
        setParsedUsers(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            {step === 'upload' && (
                <>
                    <Card className="p-6 border-2 border-dashed border-[rgb(var(--border-color))]">
                        <h3 className="text-lg font-bold mb-4">Upload User CSV File</h3>
                        
                        <div className="space-y-4">
                            {/* File Upload Area */}
                            <div className="border-2 border-dashed border-[rgb(var(--border-color))] rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => document.getElementById('csvFileInput')?.click()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2 text-[rgb(var(--text-secondary-color))]">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z" />
                                </svg>
                                <p className="font-medium">Click to select CSV file or drag and drop</p>
                                <p className="text-sm text-[rgb(var(--text-secondary-color))]">Max file size: 5MB</p>
                            </div>

                            <input
                                id="csvFileInput"
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {csvFile && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
                                    <span className="text-green-800 font-medium">✓ {csvFile.name}</span>
                                </div>
                            )}

                            {uploadError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded border border-red-200">
                                    <span className="text-red-800">❌ {uploadError}</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Template Info */}
                    <Card className="p-6 bg-blue-50 border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-3">CSV Format Required</h4>
                        <div className="bg-white p-3 rounded font-mono text-xs mb-3 overflow-x-auto">
                            <pre>{CSV_TEMPLATE}</pre>
                        </div>
                        <div className="space-y-2 text-sm text-blue-900">
                            <p><strong>Required columns:</strong> name, email, role</p>
                            <p><strong>Optional columns:</strong> department, phone, status</p>
                            <p><strong>Valid roles:</strong> student, teacher, parent, management, librarian</p>
                        </div>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={handleDownloadTemplate}
                            className="mt-3"
                        >
                            📥 Download Template
                        </Button>
                    </Card>

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                        <Button 
                            onClick={() => setStep('preview')}
                            disabled={parsedUsers.length === 0}
                        >
                            Next: Review Users ({parsedUsers.length})
                        </Button>
                    </div>
                </>
            )}

            {step === 'preview' && (
                <>
                    <Card className="p-6">
                        <h3 className="text-lg font-bold mb-4">Review Users Before Import</h3>
                        
                        {importMessage && (
                            <div className={`p-3 rounded mb-4 ${importMessage.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                                {importMessage}
                            </div>
                        )}

                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[rgb(var(--subtle-background-color))] sticky top-0">
                                    <tr>
                                        <th className="text-left p-2">Name</th>
                                        <th className="text-left p-2">Email</th>
                                        <th className="text-left p-2">Role</th>
                                        <th className="text-left p-2">Department</th>
                                        <th className="text-left p-2">Status</th>
                                        <th className="text-center p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedUsers.map((user, idx) => (
                                        <tr key={idx} className="border-b border-[rgb(var(--border-color))] hover:bg-[rgb(var(--subtle-background-color))]">
                                            <td className="p-2">{user.name}</td>
                                            <td className="p-2 text-[rgb(var(--text-secondary-color))]">{user.email}</td>
                                            <td className="p-2">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-2">{user.department || '—'}</td>
                                            <td className="p-2">
                                                <span className={`px-2 py-1 rounded text-xs ${
                                                    user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {user.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleRemoveUser(idx)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                            Total users to import: <strong>{parsedUsers.length}</strong>
                        </div>
                    </Card>

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setStep('upload')}>← Back</Button>
                        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                        <Button 
                            onClick={handleImport}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Import {parsedUsers.length} Users
                        </Button>
                    </div>
                </>
            )}

            {step === 'importing' && (
                <>
                    <Card className="p-6 text-center">
                        <h3 className="text-lg font-bold mb-4">Importing Users...</h3>
                        
                        <div className="mb-6">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>
                            <p className="text-sm text-[rgb(var(--text-secondary-color))] mt-2">{importProgress}%</p>
                        </div>

                        {importMessage && (
                            <div className={`p-3 rounded text-sm ${
                                importMessage.includes('✅') ? 'bg-green-50 text-green-800' : 
                                importMessage.includes('❌') ? 'bg-red-50 text-red-800' : 
                                'bg-blue-50 text-blue-800'
                            }`}>
                                {importMessage}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};

export default BulkUserImport;
