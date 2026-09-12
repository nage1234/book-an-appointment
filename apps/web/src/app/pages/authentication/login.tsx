import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import OutlinedInput from '@mui/material/OutlinedInput';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const justRegistered = (location.state as { registered?: boolean } | null)?.registered ?? false;

  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login({ email_id: emailId, password });
      navigate(u.type === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
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

          {justRegistered && (
            <Alert severity="success">Account created. Please sign in.</Alert>
          )}
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

          <Box>
            <FormLabel htmlFor="password" sx={{ display: 'block', mb: 0.5 }}>
              Enter your password
            </FormLabel>
            <OutlinedInput
              id="password"
              type={showPassword ? 'text' : 'password'}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showPassword ? 'hide the password' : 'display the password'
                    }
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{ display: 'inline-block', mt: 0.5 }}
            >
              Forgot password?
            </Link>
          </Box>

          <Button type="submit" disabled={submitting} sx={{ alignSelf: 'center', px: 4 }}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            Not registered yet?{' '}
            <Link component={RouterLink} to="/register">
              Sign up
            </Link>
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

export default Login;
