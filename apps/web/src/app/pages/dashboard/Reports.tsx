import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { DormantCustomer, MetricsPeriod, MetricsResponse } from '@baa/types';
import { useApiFetch } from '../authentication/useApiFetch';

const PERIODS: { value: MetricsPeriod; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
];

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 150, flex: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Paper>
  );
}

export function Reports() {
  const apiFetch = useApiFetch();
  const [period, setPeriod] = useState<MetricsPeriod>('this_month');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [dormant, setDormant] = useState<DormantCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, d] = await Promise.all([
        apiFetch<MetricsResponse>(`/admin/metrics?period=${period}`),
        apiFetch<{ customers: DormantCustomer[] }>('/admin/customers/dormant'),
      ]);
      setMetrics(m);
      setDormant(d.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, period]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Metrics
      </Typography>

      <Box sx={{ mt: 2, maxWidth: 260 }}>
        <FormLabel htmlFor="metrics-period" sx={{ display: 'block', mb: 0.5 }}>
          Period
        </FormLabel>
        <Select
          id="metrics-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as MetricsPeriod)}
          fullWidth
        >
          {PERIODS.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', gap: 2 }}>
        <StatCard label="Appointments (period)" value={metrics?.totalAppointments ?? 0} />
        <StatCard label="Total customers" value={metrics?.totals.customers ?? 0} />
        <StatCard label="Total patients" value={metrics?.totals.patients ?? 0} />
        <StatCard label="Appointments (all time)" value={metrics?.totals.appointments ?? 0} />
      </Stack>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 4, mb: 1 }}>
        Appointments per customer
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="right">Appointments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(metrics?.perCustomer ?? []).map((row) => (
              <TableRow key={row.customerId}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email_id}</TableCell>
                <TableCell align="right">{row.count}</TableCell>
              </TableRow>
            ))}
            {(metrics?.perCustomer ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} sx={{ color: 'text.secondary' }}>
                  No appointments in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 5 }}>
        Dormant customers
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Registered but have never booked an appointment.
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Registered</TableCell>
              <TableCell align="right">Patients</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dormant.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email_id}</TableCell>
                <TableCell>{c.created_at}</TableCell>
                <TableCell align="right">{c.patient_count}</TableCell>
              </TableRow>
            ))}
            {dormant.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                  Everyone has booked at least once.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default Reports;
