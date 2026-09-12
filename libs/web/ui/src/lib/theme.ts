import { createTheme } from '@mui/material/styles';

// Design tokens - see .claude/skills/ui-components/SKILL.md (single source of truth).
const FONT = 'Arial, Helvetica, sans-serif';
const TEXT = '#676363';
const PRIMARY = '#54A0D6';
const SECONDARY = '#D3D7D7';

export const theme = createTheme({
  palette: {
    primary: { main: PRIMARY, contrastText: '#FFFFFF' },
    secondary: { main: SECONDARY, contrastText: TEXT },
    text: { primary: TEXT, secondary: TEXT },
  },
  typography: {
    fontFamily: FONT,
    fontSize: 14,
    allVariants: { color: TEXT },
    button: { fontSize: 14, fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      // Contained + primary/secondary already pull background from palette.*.main
      // and text from palette.*.contrastText (set above).
      defaultProps: { disableElevation: true, variant: 'contained' },
      styleOverrides: {
        root: { border: 'none', fontSize: 14, fontWeight: 700, textTransform: 'none' },
      },
    },
    MuiLink: {
      styleOverrides: { root: { fontSize: 14, color: PRIMARY, fontWeight: 400 } },
    },
    MuiFormLabel: {
      styleOverrides: { root: { fontFamily: FONT, fontSize: 14, color: TEXT } },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: 14, color: TEXT } },
    },
    MuiTypography: {
      styleOverrides: { root: { color: TEXT } },
    },
  },
});

export default theme;
