import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import {
  SLOT_KEYS,
  SLOT_SHORT_LABELS,
  type DayAvailability,
  type SlotAvailability,
  type SlotKey,
} from '@baa/types';
import { SLOT_COLORS } from '@baa/ui';
import { dayNumber } from './helpers';

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
  borderColor: 'grey.300',
  display: 'flex',
  alignItems: 'center',
  px: 1.5,
  fontWeight: 700,
  fontSize: 14,
  color: 'text.primary',
} as const;

function tooltipFor(slot: SlotAvailability, day: DayAvailability, patientName: string): string {
  switch (slot.status) {
    case 'green':
      return 'Available — click to book';
    case 'blue':
      return `Booked for ${patientName}${slot.appointment?.status === 'completed' ? ' (completed)' : ''}`;
    case 'red':
      return 'Booked (another patient)';
    case 'grey':
      if (day.greyedReason === 'sunday') return 'Sunday — unavailable';
      if (day.greyedReason === 'holiday') return 'Holiday — unavailable';
      return 'Past — unavailable';
  }
}

interface Props {
  days: DayAvailability[];
  patientName: string;
  onSlotClick: (day: DayAvailability, slot: SlotAvailability) => void;
}

export function AvailabilityGrid({ days, patientName, onSlotClick }: Props) {
  return (
    <Box
      data-testid="availability-grid-scroll"
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
        <Box sx={{ ...headerCell, ...stickyLabel, zIndex: 3, fontWeight: 700 }}>Time / Day</Box>
        {days.map((d) => {
          const isWeekend = d.weekday === 'Sat' || d.weekday === 'Sun';
          return (
            <Box
              key={d.date}
              role="columnheader"
              sx={{ ...headerCell, bgcolor: d.greyed ? '#e6e6e6' : 'grey.50' }}
            >
              <Box sx={{ fontWeight: 700, fontSize: 15 }}>{dayNumber(d.date)}</Box>
              <Box sx={{ fontSize: 12, color: isWeekend ? '#d9534f' : 'text.secondary' }}>
                {d.weekday}
              </Box>
            </Box>
          );
        })}

        {/* One row per slot */}
        {SLOT_KEYS.map((slotKey: SlotKey, slotIdx) => (
          <Fragment key={slotKey}>
            <Box sx={stickyLabel}>{SLOT_SHORT_LABELS[slotKey]}</Box>
            {days.map((d) => {
              const slot = d.slots[slotIdx];
              const clickable = slot.status === 'green' || slot.status === 'blue';
              const isBookedLabel = slot.status === 'red' || slot.status === 'blue';
              const tip = tooltipFor(slot, d, patientName);

              return (
                <Tooltip key={`${d.date}-${slotKey}`} title={tip} arrow disableInteractive>
                  <Box
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `${SLOT_SHORT_LABELS[slotKey]} on ${d.weekday} ${dayNumber(d.date)} — ${tip}` : undefined}
                    onClick={clickable ? () => onSlotClick(d, slot) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSlotClick(d, slot);
                            }
                          }
                        : undefined
                    }
                    sx={{
                      position: 'relative',
                      m: '3px',
                      minHeight: 72,
                      borderRadius: 1,
                      bgcolor: SLOT_COLORS[slot.status],
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: slot.status === 'blue' ? 700 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: clickable ? 'pointer' : 'default',
                      outline: 'none',
                      transition: 'filter .12s',
                      '&:hover': clickable ? { filter: 'brightness(0.92)' } : undefined,
                      '&:focus-visible': clickable
                        ? { boxShadow: '0 0 0 2px #fff, 0 0 0 4px #54a0d6' }
                        : undefined,
                    }}
                  >
                    {isBookedLabel ? 'Booked' : ''}
                    {slot.status === 'blue' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 0,
                          bottom: 0,
                          width: 0,
                          height: 0,
                          borderStyle: 'solid',
                          borderWidth: '0 0 12px 12px',
                          borderColor: `transparent transparent ${SLOT_COLORS.red} transparent`,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

export default AvailabilityGrid;
