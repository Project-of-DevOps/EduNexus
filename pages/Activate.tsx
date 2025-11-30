import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Activate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const { activateUser } = useData();

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) return setError('Token is required');
    if (!password.trim()) return setError('Password is required');
    if (password !== confirm) return setError('Passwords do not match');

    const ok = activateUser(token.trim(), password);
    if (ok) {
      setSuccess('Account activated — you can sign in now');
      setTimeout(() => navigate('/login'), 1250);
    } else {
      setError('Activation failed — invalid token');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background-color))] px-4 text-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-[#1e3a8a]">Activate Account</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-secondary-color))]">Enter your activation token and choose a password</p>
        </div>

        <Card>
          <form onSubmit={handleActivate} className="space-y-4">
            <Input id="actToken" label="Activation Token" value={token} onChange={e => setToken(e.target.value)} />
            <Input id="actPassword" label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Input id="actConfirm" label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div className="text-sm text-red-500">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}
            <div className="flex justify-end">
              <Button type="submit">Activate</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Activate;
