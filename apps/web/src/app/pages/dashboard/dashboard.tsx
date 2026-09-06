import { useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAuth } from '../authentication/useAuth';
import { AvailabilityGrid, SLOT_COLORS } from './AvailabilityGrid';
import { MOCK_PATIENTS, MONTHS, YEARS, buildDays } from './mockData';

const ADD_PATIENT = '__add_patient__';

function PersonGlyph() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'currentColor', mr: 1 }}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </Box>
  );
}

function LogoutGlyph() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'currentColor', mr: 1 }}>
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </Box>
  );
}

function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const initials = (user?.name ?? 'NS')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <Avatar
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        sx={{ bgcolor: 'primary.main', color: '#fff', cursor: 'pointer', width: 40, height: 40, fontSize: 15 }}
      >
        {initials}
      </Avatar>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <PersonGlyph />
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            logout();
            navigate('/login');
          }}
          sx={{ color: '#d9534f' }}
        >
          <LogoutGlyph />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}

export function DashboardCustomer() {
  const [patient, setPatient] = useState<string>(MOCK_PATIENTS[0]);
  const [year, setYear] = useState<number>(2026);
  const [monthIndex, setMonthIndex] = useState<number>(8); // September

  const days = useMemo(() => buildDays(year, monthIndex), [year, monthIndex]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: 24, md: 32 } }}>
            Appointment Booking System
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Select your preferred year, month, and one-hour time slots below.
          </Typography>
        </Box>
        <ProfileMenu />
      </Stack>

      {/* Appointment for */}
      <Box sx={{ mt: 4, maxWidth: 520 }}>
        <FormLabel htmlFor="patient" sx={{ display: 'block', mb: 0.5 }}>
          Appointment for
        </FormLabel>
        <Select
          id="patient"
          value={patient}
          onChange={(e) => {
            const v = e.target.value;
            if (v === ADD_PATIENT) return; // UI-only pass - no dialog wired
            setPatient(v);
          }}
          fullWidth
        >
          {MOCK_PATIENTS.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
          <MenuItem
            value={ADD_PATIENT}
            sx={{
              color: '#2e7d32',
              fontWeight: 600,
              borderTop: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            + Add new patient
          </MenuItem>
        </Select>
      </Box>

      {/* Year / Month */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 3 }}>
        <Box sx={{ minWidth: 220 }}>
          <FormLabel htmlFor="year" sx={{ display: 'block', mb: 0.5 }}>
            Choose the year
          </FormLabel>
          <Select
            id="year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            fullWidth
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box sx={{ minWidth: 220 }}>
          <FormLabel htmlFor="month" sx={{ display: 'block', mb: 0.5 }}>
            Choose the month
          </FormLabel>
          <Select
            id="month"
            value={monthIndex}
            onChange={(e) => setMonthIndex(Number(e.target.value))}
            fullWidth
          >
            {MONTHS.map((m, i) => (
              <MenuItem key={m} value={i}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Stack>

      {/* Availability grid */}
      <Box sx={{ mt: 4 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Availability Grid
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Scroll horizontally to view all {days.length} days →
          </Typography>
        </Stack>

        <AvailabilityGrid days={days} />
      </Box>

      {/* Note + legend */}
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Note: Each time slot is 1 hour in duration. Click on a slot to select/deselect it.
      </Typography>

      <Stack direction="row" sx={{ mt: 2, gap: 2.5, flexWrap: 'wrap' }}>
        {[
          { c: SLOT_COLORS.green, label: 'Available' },
          { c: SLOT_COLORS.red, label: 'Booked (Others)' },
          { c: SLOT_COLORS.blue, label: 'Booked (Self)' },
          { c: SLOT_COLORS.grey, label: 'Holiday / Unavailable' },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 18, height: 18, borderRadius: 0.5, bgcolor: item.c }} />
            <Typography variant="body2">{item.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default DashboardCustomer;
