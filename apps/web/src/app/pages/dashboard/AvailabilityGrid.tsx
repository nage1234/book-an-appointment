import { Fragment } from 'react';
import Box from '@mui/material/Box';
import type { SlotStatus } from '@baa/types';
import { SLOT_ROW_LABELS, mockStatus, type DayColumn } from './mockData';

export const SLOT_COLORS: Record<SlotStatus, string> = {
  green: '#5cb85c',
  red: '#d9534f',
  blue: '#54a0d6',
  grey: '#cccccc',
};

const LABEL_COL = 132;
const DAY_COL = 104;

const headerCell = {
  py: 1,
  px: 0.5,
  textAlign: 'center',
  bgcolor: 'grey.50',
  borderBottom: '1px solid',
  borderColor: 'grey.300',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.25,
} as const;

const stickyLabel = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  bgcolor: 'grey.50',
  borderRight: '1px solid',
  borderColor: 'grey.300',
  display: 'flex',
  alignItems: 'center',
  px: 1.5,
  fontWeight: 700,
  fontSize: 14,
  color: 'text.primary',
} as const;

export function AvailabilityGrid({ days }: { days: DayColumn[] }) {
  return (
    <Box
      sx={{
        mt: 1.5,
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 1,
        overflowX: 'auto',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `${LABEL_COL}px repeat(${days.length}, ${DAY_COL}px)`,
          minWidth: 'max-content',
        }}
      >
        {/* Header row */}
        <Box sx={{ ...headerCell, ...stickyLabel, zIndex: 3, fontWeight: 700 }}>
          Time / Day
        </Box>
        {days.map((d) => (
          <Box
            key={d.day}
            sx={{ ...headerCell, bgcolor: d.isSunday ? '#e6e6e6' : 'grey.50' }}
          >
            <Box sx={{ fontWeight: 700, fontSize: 15 }}>{d.day}</Box>
            <Box
              sx={{
                fontSize: 12,
                color: d.isWeekend ? '#d9534f' : 'text.secondary',
              }}
            >
              {d.weekday}
            </Box>
          </Box>
        ))}

        {/* One row per slot */}
        {SLOT_ROW_LABELS.map((label, slotIdx) => (
          <Fragment key={label}>
            <Box sx={stickyLabel}>{label}</Box>
            {days.map((d) => {
              const status = mockStatus(d.day, slotIdx, d.isSunday);
              const booked = status === 'red' || status === 'blue';
              return (
                <Box
                  key={`${d.day}-${slotIdx}`}
                  sx={{
                    m: '3px',
                    minHeight: 72,
                    borderRadius: 1,
                    bgcolor: SLOT_COLORS[status],
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: status === 'blue' ? 700 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {booked ? 'Booked' : ''}
                </Box>
              );
            })}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

export default AvailabilityGrid;
