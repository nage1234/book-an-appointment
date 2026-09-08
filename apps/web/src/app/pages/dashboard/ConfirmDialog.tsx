import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Props {
  open: boolean;
  title: string;
  body: ReactNode;
  onClose: () => void;
  /** omit to render a status-only dialog with a single Close button */
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmColor?: 'primary' | 'error' | 'secondary';
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  title,
  body,
  onClose,
  onConfirm,
  confirmLabel = 'Yes',
  confirmColor = 'primary',
  cancelLabel = 'Cancel',
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {onConfirm ? (
          <>
            <Button color="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              color={confirmColor}
              onClick={onConfirm}
              sx={confirmColor === 'error' ? { bgcolor: '#d9534f', color: '#fff' } : undefined}
            >
              {confirmLabel}
            </Button>
          </>
        ) : (
          <Button color="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;
