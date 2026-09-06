import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from './useAuth';
import logo from '../../../assets/logo.png';

const MIN_PASSWORD = 8;

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email_id: emailId, password });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
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
        component="form"
        onSubmit={handleSubmit}
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
            Customer Registration
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <FormLabel htmlFor="name" sx={{ display: 'block', mb: 0.5 }}>
              Name
            </FormLabel>
            <TextField
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
              autoComplete="name"
            />
          </Box>

          <Box>
            <FormLabel htmlFor="email_id" sx={{ display: 'block', mb: 0.5 }}>
              Email
            </FormLabel>
            <TextField
              id="email_id"
              type="email"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
          </Box>

          <Box>
            <FormLabel htmlFor="password" sx={{ display: 'block', mb: 0.5 }}>
              Password
            </FormLabel>
            <TextField
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
            />
          </Box>

          <Box>
            <FormLabel htmlFor="confirmPassword" sx={{ display: 'block', mb: 0.5 }}>
              Re-type password
            </FormLabel>
            <TextField
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', pt: 1 }}>
            <Button
              color="secondary"
              onClick={() => navigate('/login')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default Register;
