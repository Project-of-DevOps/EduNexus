import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getApiUrl } from '../utils/config';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('✅ Email verified successfully! Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          const errorMsg = data.error || 'Verification failed';
          if (errorMsg.includes('expired')) {
            setStatus('expired');
            setMessage('❌ Verification link has expired. Please sign up again.');
          } else {
            setStatus('error');
            setMessage(`❌ ${errorMsg}`);
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('❌ An error occurred while verifying your email. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Verifying Email</h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 text-5xl">✅</div>
              <h2 className="text-2xl font-bold mb-2 text-green-600">Email Verified!</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login in 3 seconds...</p>
              <Button
                onClick={() => navigate('/login')}
                className="mt-6 w-full"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="mb-6 text-5xl">⏱️</div>
              <h2 className="text-2xl font-bold mb-2 text-orange-600">Link Expired</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
              <Button
                onClick={() => navigate('/signup')}
                className="mt-6 w-full"
              >
                Sign Up Again
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 text-5xl">❌</div>
              <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Failed</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="flex-1"
                >
                  Back to Login
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="flex-1"
                >
                  Sign Up
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Info section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been confirmed and you can now access all features.'}
            {status === 'expired' && 'Verification links expire after 24 hours for security.'}
            {status === 'error' && 'Please contact support if this issue persists.'}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
