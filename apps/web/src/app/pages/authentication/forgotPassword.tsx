import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from './useAuth';
import logo from '../../../assets/logo.png';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [emailId, setEmailId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(emailId);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        component={sent ? 'div' : 'form'}
        onSubmit={sent ? undefined : handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
          border: 1,
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 3,
        }}
      >
        <Stack spacing={2.5}>
          <Box
            component="img"
            src={logo}
            alt="Clinic logo"
            sx={{ width: 96, height: 'auto', alignSelf: 'center' }}
          />

          <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Forgot password
          </Typography>

          {sent ? (
            <>
              <Alert severity="success">
                If that email is registered, we've sent a new password to it. Sign in with it,
                then change it from your profile menu.
              </Alert>
              <Button onClick={() => navigate('/login')} sx={{ alignSelf: 'center', px: 4 }}>
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Enter your registered email address and we'll send a new password to it.
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <Box>
                <FormLabel htmlFor="email_id" sx={{ display: 'block', mb: 0.5 }}>
                  Enter your email address
                </FormLabel>
                <TextField
                  id="email_id"
                  type="email"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                  autoFocus
                />
              </Box>

              <Button type="submit" disabled={submitting} sx={{ alignSelf: 'center', px: 4 }}>
                {submitting ? 'Sending…' : 'Send new password'}
              </Button>

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login">
                  Back to sign in
                </Link>
              </Typography>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default ForgotPassword;
