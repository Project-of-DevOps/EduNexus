import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const ConfirmCodePage: React.FC = () => {
  const { token } = useParams();
  const { confirmOrgCodeRequest } = useData();
  const [status, setStatus] = React.useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [resultCode, setResultCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    setStatus('processing');
    // try confirming
    const res = confirmOrgCodeRequest(token);
    if (res === false) {
      setStatus('failed');
    } else {
      setStatus('success');
      setResultCode(res.code);
    }
  }, [token]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-2">Developer confirmation</h2>
        <p className="text-sm text-gray-600 mb-4">This page confirms the requested management code (token: <span className="font-mono">{token}</span>).</p>

        {status === 'processing' && <p className="text-sm">Confirming...</p>}
        {status === 'failed' && (
          <div>
            <p className="text-sm text-red-600">Confirmation failed — invalid token or already used.</p>
            <div className="mt-4">
              <Link to="/login"><Button variant="secondary">Return to app</Button></Link>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <p className="text-sm text-green-700">Confirmation successful — a new management code has been generated and sent to the management email.</p>
            <p className="mt-2 font-mono text-lg font-bold">{resultCode}</p>
            <div className="mt-4">
              <Link to="/login"><Button>Finish</Button></Link>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
};

export default ConfirmCodePage;
