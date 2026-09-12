import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { MIN_PASSWORD_LENGTH } from '@baa/types';
import { encodePassword, useAuth } from '../authentication/useAuth';
import { useApiFetch } from '../authentication/useApiFetch';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const apiFetch = useApiFetch();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleClickShowPassword = () => setShowOldPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleClickShowNewPassword = () => setShowNewPassword((show) => !show);
  const handleMouseDownNewPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleMouseUpNewPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const reset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setDone(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit = oldPassword !== '' && newPassword !== '' && confirmPassword !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from the old password.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email_id: user?.email_id,
          oldPassword: encodePassword(oldPassword),
          newPassword: encodePassword(newPassword),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          {done ? (
            <Alert severity="success">Your password has been changed.</Alert>
          ) : (
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}

              <Box>
                <FormLabel htmlFor="cp-email" sx={{ display: 'block', mb: 0.5 }}>
                  Email id
                </FormLabel>
                <TextField id="cp-email" value={user?.email_id ?? ''} fullWidth disabled />
              </Box>

              <Box>
                <FormLabel htmlFor="cp-old" sx={{ display: 'block', mb: 0.5 }}>
                  Old password
                </FormLabel>
                <OutlinedInput
                  id="cp-old"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        onMouseUp={handleMouseUpPassword}
                        edge="end"
                      >
                        {showOldPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  required
                  fullWidth
                  autoFocus
                  autoComplete="current-password"
                />
              </Box>

              <Box>
                <FormLabel htmlFor="cp-new" sx={{ display: 'block', mb: 0.5 }}>
                  New password
                </FormLabel>
                <OutlinedInput
                  id="cp-new"
                  type="password"
                  value={newPassword}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowNewPassword}
                        onMouseDown={handleMouseDownNewPassword}
                        onMouseUp={handleMouseUpNewPassword}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                />
              </Box>

              <Box>
                <FormLabel htmlFor="cp-confirm" sx={{ display: 'block', mb: 0.5 }}>
                  Confirm new password
                </FormLabel>
                <OutlinedInput
                  id="cp-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {done ? (
            <Button onClick={close}>Close</Button>
          ) : (
            <>
              <Button color="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? 'Changing…' : 'Change password'}
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default ChangePasswordDialog;
