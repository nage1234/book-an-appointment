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
  CustomerSummary,
  DayAvailability,
  Patient,
  SlotAvailability,
} from '@baa/types';
import { SLOT_COLORS } from '@baa/ui';
import { useAuth } from '../authentication/useAuth';
import { useApiFetch } from '../authentication/useApiFetch';
import { AvailabilityGrid } from './AvailabilityGrid';
import { AddPatientDialog, type NewPatient } from './AddPatientDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
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

function LogoutGlyph() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'currentColor', mr: 1 }}>
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </Box>
  );
}

function KeyGlyph() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'currentColor', mr: 1 }}>
      <path d="M12.65 10A5.99 5.99 0 0 0 7 6a6 6 0 1 0 5.65 8H15v2h2v2h4v-4h-3.35A6.02 6.02 0 0 0 18 10h-5.35zM7 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </Box>
  );
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setChangePasswordOpen(true);
          }}
        >
          <KeyGlyph />
          Change password
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
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}

type SlotDialog = { mode: 'book' | 'cancel'; day: DayAvailability; slot: SlotAvailability };

/**
 * The availability dashboard — the same component for customer (`/dashboard`) and
 * the admin Dashboard tab. Admins get an extra Customer selector and use the
 * `/api/admin/*` endpoints (bypass limits, cancellation emails).
 */
export function AvailabilityDashboard({ hideHeader = false }: { hideHeader?: boolean }) {
  const apiFetch = useApiFetch();
  const { user } = useAuth();
  const isAdmin = user?.type === 'admin';

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? null;
  const needsCustomer = isAdmin && customerId === null;

  // Admin: load the customer list once.
  useEffect(() => {
    if (!isAdmin) return;
    apiFetch<{ customers: CustomerSummary[] }>('/admin/customers')
      .then((r) => setCustomers(r.customers))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load customers.'));
  }, [isAdmin, apiFetch]);

  const loadPatients = useCallback(async () => {
    if (isAdmin) {
      if (customerId === null) {
        setPatients([]);
        setSelectedId(null);
        return;
      }
      const { patients: list } = await apiFetch<{ patients: Patient[] }>(
        `/admin/customers/${customerId}/patients`
      );
      setPatients(list);
      setSelectedId(list[0]?.id ?? null);
      return;
    }
    const { patients: list } = await apiFetch<{ patients: Patient[] }>('/patients');
    setPatients(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
  }, [apiFetch, isAdmin, customerId]);

  const loadAvailability = useCallback(async () => {
    if (selectedId === null) {
      setAvailability(null);
      return;
    }
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
      await apiFetch(isAdmin ? '/admin/appointments' : '/appointments', {
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
    } catch (err) {
      setSnack(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setDialog(null);
      setBusy(false);
      await loadAvailability();
    }
  };

  const confirmCancel = async () => {
    if (!dialog?.slot.appointment) return;
    setBusy(true);
    const id = dialog.slot.appointment.id;
    try {
      await apiFetch(
        isAdmin ? `/admin/appointments/${id}/cancel` : `/appointments/${id}/cancel`,
        { method: 'POST' }
      );
      setSnack(isAdmin ? 'Appointment cancelled — the customer has been emailed.' : 'Appointment cancelled.');
    } catch (err) {
      setSnack(err instanceof Error ? err.message : 'Cancellation failed.');
    } finally {
      setDialog(null);
      setBusy(false);
      await loadAvailability();
    }
  };

  const handleAddPatient = async (np: NewPatient) => {
    try {
      const { patient } = await apiFetch<{ patient: Patient }>(
        isAdmin ? `/admin/customers/${customerId}/patients` : '/patients',
        { method: 'POST', body: JSON.stringify(np) }
      );
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
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: hideHeader ? 0 : { xs: 2, md: 4 } }}>
      {!hideHeader && (
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
      )}

      {/* Admin: customer selector */}
      {isAdmin && (
        <Box sx={{ mt: hideHeader ? 0 : 4, maxWidth: 520 }}>
          <FormLabel htmlFor="customer" sx={{ display: 'block', mb: 0.5 }}>
            Customer
          </FormLabel>
          <Select
            id="customer"
            value={customerId === null ? '' : String(customerId)}
            displayEmpty
            onChange={(e) => {
              setSelectedId(null);
              setAvailability(null);
              setCustomerId(e.target.value === '' ? null : Number(e.target.value));
            }}
            renderValue={(v) => {
              if (v === '') return 'Select a customer';
              const c = customers.find((x) => String(x.id) === v);
              return c ? `${c.name} (${c.email_id})` : '';
            }}
            fullWidth
          >
            <MenuItem value="" disabled>
              Select a customer
            </MenuItem>
            {customers.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name} ({c.email_id})
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}

      {/* Appointment for */}
      <Box sx={{ mt: isAdmin ? 3 : hideHeader ? 0 : 4, maxWidth: 520 }}>
        <FormLabel htmlFor="patient" sx={{ display: 'block', mb: 0.5 }}>
          Appointment for
        </FormLabel>
        <Select
          id="patient"
          value={selectedId === null ? '' : String(selectedId)}
          displayEmpty
          disabled={needsCustomer}
          onChange={(e) => {
            const v = e.target.value;
            if (v === ADD_PATIENT) {
              setAddOpen(true);
              return;
            }
            setSelectedId(v === '' ? null : Number(v));
          }}
          renderValue={(v) =>
            v === '' ? CHOOSE_PATIENT : patients.find((p) => String(p.id) === v)?.name ?? ''
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
          {!needsCustomer && (
            <MenuItem
              value={ADD_PATIENT}
              sx={{ color: '#2e7d32', fontWeight: 600, borderTop: '1px solid', borderColor: 'grey.200' }}
            >
              + Add new patient
            </MenuItem>
          )}
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

      {needsCustomer && (
        <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', fontStyle: 'italic' }}>
          Select a customer to begin.
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

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
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Scroll horizontally to view all {days.length} days →
              </Typography>
            </Stack>

            <AvailabilityGrid
              days={days}
              patientName={selectedPatient.name}
              onSlotClick={handleSlotClick}
            />
          </Box>

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
          // Customer: a completed appointment shows status only. Admin can cancel anything.
          if (!isAdmin && appt?.status === 'completed') {
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
                  <strong>{selectedPatient.name}</strong> — {when} —{' '}
                  {appt?.status === 'completed' ? 'Completed' : 'Booked'}.
                  <br />
                  Do you want to cancel this appointment?
                  {isAdmin && <><br /><em>The customer will be emailed.</em></>}
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

export default AvailabilityDashboard;
