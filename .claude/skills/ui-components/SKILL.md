---
name: ui-components
description: Design tokens and MUI theme for book-an-appointment - button styles, typography, colours, links. Use whenever building or restyling any UI so components stay consistent. This is the single source of truth for look-and-feel; extend it as new rules are agreed.
---

# UI components & typography

The MUI theme in `libs/web/ui/src/theme.ts` is the single place these tokens are
applied. Build screens with plain MUI components (`Button`, `Link`, `TextField`,
`FormLabel`, `Typography`) and let the theme style them — avoid one‑off `sx`
colours/sizes that duplicate what's below.

## Design tokens

| Token | Value | Used for |
| --- | --- | --- |
| `color.primary` | `#54A0D6` | primary button background, links |
| `color.secondary` | `#D3D7D7` | secondary button background (e.g. "Cancel") |
| `color.text` | `#676363` | **all** component text — labels, inputs, body, headings |
| `font.family` | `Arial, Helvetica, sans-serif` | everything |
| `font.size.base` | `16px` | default for text, labels, buttons, links |

## Rules

### Buttons
- Background: **primary** `#54A0D6`; **secondary / Cancel** `#D3D7D7`.
- **No border.**
- Font size **16**, **bold** (700).
- No elevation, no uppercase transform (keep the label as written).
- Text colour: secondary buttons use `#676363`. Primary buttons use `#FFFFFF`
  for contrast on the blue — *assumption, confirm with the user; not yet specified.*

### Labels (form labels)
- Arial, size **16**, colour `#676363`.

### Links (e.g. "Forgot password?")
- Size **16**, colour `#54A0D6`.

### Everything else
- Default text colour across all components is `#676363`.

### Responsive design (required)
- Every screen must be **fully responsive** and look correct on mobile — phones
  (~360px wide) through tablet to desktop. Mobile is a first‑class target, not an
  afterthought.
- Design mobile‑first: base styles target small screens; use MUI breakpoints
  (`theme.breakpoints` / `sx={{ ... , md: ... }}` / `useMediaQuery`) to adapt upward.
- Layout: fluid widths, no fixed pixel widths that overflow a phone. Auth card is
  `width: 100%; maxWidth: 400px` and centred. The dashboard grid scrolls
  horizontally inside its own container — the page body never scrolls sideways.
- Tap targets ≥ 44px; inputs and buttons go full‑width on `xs`.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` is set in
  `apps/web/index.html`.
- Verify at 360×640, 768×1024, and ≥1280 before calling a screen done.

> This list will grow. When the user gives a new rule, add it here **and** to the
> theme, then reference the token from components.

## MUI theme (`libs/web/ui/src/theme.ts`)

```ts
import { createTheme } from '@mui/material/styles';

const FONT = 'Arial, Helvetica, sans-serif';
const TEXT = '#676363';
const PRIMARY = '#54A0D6';
const SECONDARY = '#D3D7D7';

export const theme = createTheme({
  palette: {
    primary: { main: PRIMARY, contrastText: '#FFFFFF' }, // confirm primary btn text colour
    secondary: { main: SECONDARY, contrastText: TEXT },
    text: { primary: TEXT, secondary: TEXT },
  },
  typography: {
    fontFamily: FONT,
    fontSize: 16,
    allVariants: { color: TEXT },
    button: { fontSize: 16, fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, variant: 'contained' },
      styleOverrides: {
        root: { border: 'none', fontSize: 16, fontWeight: 700, textTransform: 'none' },
        containedPrimary: { backgroundColor: PRIMARY, color: '#FFFFFF' },
        containedSecondary: { backgroundColor: SECONDARY, color: TEXT },
      },
    },
    MuiLink: {
      styleOverrides: { root: { fontSize: 16, color: PRIMARY, fontWeight: 400 } },
    },
    MuiFormLabel: {
      styleOverrides: { root: { fontFamily: FONT, fontSize: 16, color: TEXT } },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: 16, color: TEXT } },
    },
    MuiTypography: {
      styleOverrides: { root: { color: TEXT } },
    },
  },
});
```

Wrap `apps/web` in `<ThemeProvider theme={theme}><CssBaseline/>…`.

## Usage examples

```tsx
// Primary action
<Button type="submit">Sign in</Button>

// Secondary action
<Button color="secondary" onClick={onClose}>Cancel</Button>

// Link
<Link component={RouterLink} to="/forgot-password">Forgot password?</Link>

// Labelled field — FormLabel/InputBase pick up the theme automatically
<TextField label="Email" />
```

## Checklist

- [ ] Buttons come from `<Button>` with `color="secondary"` for Cancel‑style actions — no manual background colours
- [ ] No hard‑coded hex in components; use theme tokens / lib constants
- [ ] Links use `<Link>` (size 16, `#54A0D6`)
- [ ] New agreed rule added here **and** to `theme.ts`
- [ ] Every screen is fully responsive, tested at 360×640, 768×1024, and ≥1280
- [ ] Always move the components to the @baa/ui lib if they are reusable and data-free.
- [ ] implement the components with accessibility in mind, following WAI-ARIA guidelines and best practices for keyboard navigation and screen reader support.
