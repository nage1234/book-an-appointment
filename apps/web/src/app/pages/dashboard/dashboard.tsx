import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type {
  AvailabilityResponse,
  DayAvailability,
  Patient,
  SlotAvailability,
} from '@baa/types';
import { SLOT_COLORS } from '@baa/ui';
import { useAuth } from '../authentication/useAuth';
import { useApiFetch } from '../authentication/useApiFetch';
import { AvailabilityGrid } from './AvailabilityGrid';
import { AddPatientDialog, type NewPatient } from './AddPatientDialog';
import { ConfirmDialog } from './ConfirmDialog';
import {
  MONTHS,
  bookingWindow,
  formatDayLabel,
  formatSlotRange,
  isMonthEditable,
  monthOptionsFor,
  viewWindow,
  yearOptions,
} from './helpers';

const ADD_PATIENT = '__add_patient__';
const CHOOSE_PATIENT = 'Choose a patient';

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
      <IconButton
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        sx={{ p: 0 }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 40, height: 40, fontSize: 15 }}>
          {initials}
        </Avatar>
      </IconButton>
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

type SlotDialog = { mode: 'book' | 'cancel'; day: DayAvailability; slot: SlotAvailability };

export function DashboardCustomer() {
  const apiFetch = useApiFetch();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // All selectable months (2 years back … current + 2); booking/edit is limited to bookingWindow.
  const window = useMemo(() => viewWindow(), []);
  const current = useMemo(() => bookingWindow()[0], []);
  const [year, setYear] = useState<number>(current.year);
  const [monthNum, setMonthNum] = useState<number>(current.month);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [dialog, setDialog] = useState<SlotDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? "";

  const loadPatients = useCallback(async () => {
    const { patients: list } = await apiFetch<{ patients: Patient[] }>('/patients');
    setPatients(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    return list;
  }, [apiFetch]);

  const loadAvailability = useCallback(async () => {
    if (selectedId === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AvailabilityResponse>(
        `/availability?year=${year}&month=${monthNum}&patientId=${selectedId}`
      );
      setAvailability(data);
    } catch (err) {
      setAvailability(null);
      setError(err instanceof Error ? err.message : 'Could not load availability.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, year, monthNum, selectedId]);

  useEffect(() => {
    loadPatients().catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not load patients.')
    );
  }, [loadPatients]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleSlotClick = (day: DayAvailability, slot: SlotAvailability) => {
    // Past months are view-only: still let the patient inspect their own bookings.
    if (slot.status === 'green' && isMonthEditable({ year, month: monthNum })) {
      setDialog({ mode: 'book', day, slot });
    } else if (slot.status === 'blue') {
      setDialog({ mode: 'cancel', day, slot });
    }
  };

  const confirmBook = async () => {
    if (!dialog || !selectedPatient) return;
    setBusy(true);
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          date: dialog.day.date,
          slot: dialog.slot.slot,
          patientId: selectedPatient.id,
        }),
      });
      setSnack(
        `Booked for ${selectedPatient.name} on ${formatDayLabel(dialog.day.date)}, ${formatSlotRange(
          dialog.slot.slot
        )}.`
      );
      setDialog(null);
      await loadAvailability();
    } catch (err) {
      setSnack(err instanceof Error ? err.message : 'Booking failed.');
      setDialog(null);
      await loadAvailability();
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (!dialog?.slot.appointment) return;
    setBusy(true);
    try {
      await apiFetch(`/appointments/${dialog.slot.appointment.id}/cancel`, { method: 'POST' });
      setSnack('Appointment cancelled.');
      setDialog(null);
      await loadAvailability();
    } catch (err) {
      setSnack(err instanceof Error ? err.message : 'Cancellation failed.');
      setDialog(null);
      await loadAvailability();
    } finally {
      setBusy(false);
    }
  };

  const handleAddPatient = async (np: NewPatient) => {
    try {
      const { patient } = await apiFetch<{ patient: Patient }>('/patients', {
        method: 'POST',
        body: JSON.stringify(np),
      });
      await loadPatients();
      setSelectedId(patient.id);
      setAddOpen(false);
      setSnack(`${patient.name} added.`);
    } catch (err) {
      setSnack(err instanceof Error ? err.message : 'Could not add patient.');
    }
  };

  const days = availability?.days ?? [];
  const editable = isMonthEditable({ year, month: monthNum });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          value={selectedId === null ? '' : String(selectedId)}
          displayEmpty
          onChange={(e) => {
            const v = e.target.value;
            if (v === ADD_PATIENT) {
              setAddOpen(true);
              return;
            }
            setSelectedId(v === CHOOSE_PATIENT ? null : Number(v));
          }}
          renderValue={(v) =>
            v ===  "" ? CHOOSE_PATIENT : patients.find((p) => String(p.id) === v)?.name
          }
          fullWidth
        >
          <MenuItem value="" disabled>
            {CHOOSE_PATIENT}
          </MenuItem>
          {patients.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              {p.name}
            </MenuItem>
          ))}
          <MenuItem
            value={ADD_PATIENT}
            sx={{ color: '#2e7d32', fontWeight: 600, borderTop: '1px solid', borderColor: 'grey.200' }}
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
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              const months = monthOptionsFor(y, window);
              if (!months.includes(monthNum)) setMonthNum(months[0]);
            }}
            fullWidth
          >
            {yearOptions(window).map((y) => (
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
            value={monthNum}
            onChange={(e) => setMonthNum(Number(e.target.value))}
            fullWidth
          >
            {monthOptionsFor(year, window).map((m) => (
              <MenuItem key={m} value={m}>
                {MONTHS[m - 1]}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Stack>

      {/* Availability grid */}
      {!loading && !error && selectedPatient && days.length > 0 && (
        <>
          <Box sx={{ mt: 4 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Availability Grid
              </Typography>
              {!editable && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Read-only history — booking is limited to the current and next two months.
                </Typography>
              )}
              {days.length > 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Scroll horizontally to view all {days.length} days →
                </Typography>
              )}
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}
            <AvailabilityGrid
              days={days}
              patientName={selectedPatient.name}
              onSlotClick={handleSlotClick}
            />
          </Box>

          {/* Note + legend */}
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Note: Each time slot is 1 hour in duration. Click a green slot to book, a blue slot to manage it.
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
        </>
      )}

      {/* Dialogs */}
      <AddPatientDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddPatient} />

      {dialog?.mode === 'book' && selectedPatient && (
        <ConfirmDialog
          open
          title="Confirm booking"
          body={
            <>
              Book an appointment for <strong>{selectedPatient.name}</strong> on{' '}
              {formatDayLabel(dialog.day.date)}, {formatSlotRange(dialog.slot.slot)}?
            </>
          }
          confirmLabel={busy ? 'Booking…' : 'Yes, book'}
          cancelLabel="Cancel"
          onConfirm={busy ? undefined : confirmBook}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.mode === 'cancel' &&
        selectedPatient &&
        (() => {
          const when = `${formatDayLabel(dialog.day.date)}, ${formatSlotRange(dialog.slot.slot)}`;
          const appt = dialog.slot.appointment;
          if (appt?.status === 'completed') {
            return (
              <ConfirmDialog
                open
                title="Appointment status"
                body={
                  <>
                    This appointment for <strong>{selectedPatient.name}</strong> on {when} is{' '}
                    <strong>Completed</strong>.
                  </>
                }
                onClose={() => setDialog(null)}
              />
            );
          }
          return (
            <ConfirmDialog
              open
              title="Cancel appointment"
              body={
                <>
                  <strong>{selectedPatient.name}</strong> — {when} — Booked.
                  <br />
                  Do you want to cancel this appointment?
                </>
              }
              confirmLabel={busy ? 'Cancelling…' : 'Yes, cancel'}
              confirmColor="error"
              cancelLabel="Keep it"
              onConfirm={busy ? undefined : confirmCancel}
              onClose={() => setDialog(null)}
            />
          );
        })()}

      <Snackbar
        open={snack !== null}
        onClose={() => setSnack(null)}
        autoHideDuration={4000}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default DashboardCustomer;
