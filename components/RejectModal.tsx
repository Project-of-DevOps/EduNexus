import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Select from './ui/Select';

const cannedReasons = [
  'Duplicate / Already Exists',
  'Invalid / Insufficient details',
  'Not a good fit for our platform',
  'Security / policy concern',
  'Other'
];

export interface RejectModalProps {
  open: boolean;
  token?: string;
  onClose: () => void;
  onConfirm: (token: string | undefined, reason: string) => void;
}

const RejectModal: React.FC<RejectModalProps> = ({ open, token, onClose, onConfirm }) => {
  const [reasonTemplate, setReasonTemplate] = React.useState(cannedReasons[0]);
  const [customReason, setCustomReason] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setCustomReason('');
      setReasonTemplate(cannedReasons[0]);
    }
  }, [open]);

  const handleConfirm = () => {
    const reason = reasonTemplate === 'Other' ? customReason.trim() : reasonTemplate;
    onConfirm(token, reason);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Reject Request">
      <div className="space-y-3">
        <div className="text-sm text-gray-700">Choose a reason to reject this request or enter a custom message that will be emailed to the requester.</div>
        <div>
          <Select value={reasonTemplate} onChange={(e: any) => setReasonTemplate(e.target.value)}>
            {cannedReasons.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        {reasonTemplate === 'Other' && (
          <textarea rows={4} value={customReason} onChange={e => setCustomReason(e.target.value)} className="w-full p-2 border rounded" placeholder="Describe rejection reason" />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} variant="danger">Reject Request</Button>
        </div>
      </div>
    </Modal>
  );
};

export default RejectModal;
