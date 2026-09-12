import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { AvailabilityDashboard, ProfileMenu } from './dashboard';
import { HolidaysPanel } from './HolidaysPanel';
import { Reports } from './Reports';

export function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Shared header */}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: 24, md: 32 } }}>
            Appointment Booking System
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Admin — manage bookings, holidays, and reports.
          </Typography>
        </Box>
        <ProfileMenu />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }} sx={{ mt: 4 }}>
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderRight: { md: 1 }, borderColor: 'divider', minWidth: { md: 160 } }}
        >
          <Tab label="Dashboard" id="admin-tab-0" aria-controls="admin-panel-0" />
          <Tab label="Reports" id="admin-tab-1" aria-controls="admin-panel-1" />
        </Tabs>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box role="tabpanel" hidden={tab !== 0} id="admin-panel-0" aria-labelledby="admin-tab-0">
            {tab === 0 && (
              <>
                <AvailabilityDashboard key={gridRefreshKey} hideHeader />
                <HolidaysPanel onChanged={() => setGridRefreshKey((k) => k + 1)} />
              </>
            )}
          </Box>
          <Box role="tabpanel" hidden={tab !== 1} id="admin-panel-1" aria-labelledby="admin-tab-1">
            {tab === 1 && <Reports />}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default AdminDashboard;
