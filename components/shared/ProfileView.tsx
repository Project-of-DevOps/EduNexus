import React, { useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

const ProfileView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateProfile({ avatarUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[rgb(var(--subtle-background-color))] flex items-center justify-center text-2xl font-semibold text-[rgb(var(--text-color))]">
                {user?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U'}
              </div>
            )}
            <div className="mt-3 flex justify-center">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs px-3 py-1">
                Add Profile
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {/* School/Institute Name Display */}
            {(user as any).instituteId && (
              <div className="mb-4 pb-4 border-b border-[rgb(var(--border-color))]">
                <p className="text-sm text-[rgb(var(--text-secondary-color))]">
                  {(user as any).type === 'school' ? 'School Name' : 'Institute Name'}
                </p>
                <h2 className="text-2xl font-bold text-[rgb(var(--text-color))]">
                  {(user as any).instituteId}
                </h2>
              </div>
            )}
            <div>
              <p className="text-sm text-[rgb(var(--text-secondary-color))]">Name</p>
              <p className="text-lg font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-[rgb(var(--text-secondary-color))]">Role</p>
              <p className="text-lg font-semibold capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-sm text-[rgb(var(--text-secondary-color))]">Email</p>
              <p className="text-lg font-semibold">{user.email}</p>
            </div>
            {user.role === 'management' && (
              <div>
                {/* Removed duplicate display */}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileView;

