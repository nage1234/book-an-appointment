import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Holiday } from '@baa/types';
import { useApiFetch } from '../authentication/useApiFetch';
import { formatDayLabel } from './helpers';

export function HolidaysPanel({ onChanged }: { onChanged?: () => void }) {
  const apiFetch = useApiFetch();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { holidays: list } = await apiFetch<{ holidays: Holiday[] }>('/admin/holidays');
      setHolidays(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load holidays.');
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError(null);
    try {
      const { cancelledCount } = await apiFetch<{ cancelledCount: number }>('/admin/holidays', {
        method: 'POST',
        body: JSON.stringify({ date, description: description.trim() }),
      });
      setDate('');
      setDescription('');
      await load();
      onChanged?.();
      if (cancelledCount > 0) {
        setError(
          `${cancelledCount} booking${cancelledCount === 1 ? '' : 's'} on that date ${
            cancelledCount === 1 ? 'was' : 'were'
          } cancelled and the customer${cancelledCount === 1 ? '' : 's'} emailed.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the holiday.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (holidayDate: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/holidays/${holidayDate}`, { method: 'DELETE' });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the holiday.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mt: 5, maxWidth: 520 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Holidays
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        A holiday greys the whole day out for every customer and cancels any bookings on it.
      </Typography>

      {error && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={add}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-end' }}>
          <Box>
            <FormLabel htmlFor="holiday-date" sx={{ display: 'block', mb: 0.5 }}>
              Date
            </FormLabel>
            <TextField
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
          <Box sx={{ flex: 1, width: '100%' }}>
            <FormLabel htmlFor="holiday-desc" sx={{ display: 'block', mb: 0.5 }}>
              Description
            </FormLabel>
            <TextField
              id="holiday-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Independence Day"
              fullWidth
            />
          </Box>
          <Button type="submit" disabled={busy || !date}>
            Add
          </Button>
        </Stack>
      </Box>

      <List sx={{ mt: 2 }}>
        {holidays.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No holidays set.
          </Typography>
        )}
        {holidays.map((h) => (
          <ListItem
            key={h.holiday_date}
            divider
            secondaryAction={
              <IconButton
                aria-label={`Remove holiday on ${h.holiday_date}`}
                onClick={() => remove(h.holiday_date)}
                disabled={busy}
                size="small"
                sx={{ color: '#d9534f' }}
              >
                ✕
              </IconButton>
            }
          >
            <ListItemText primary={formatDayLabel(h.holiday_date)} secondary={h.description || '—'} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default HolidaysPanel;
