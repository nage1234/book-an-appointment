import { Route, Routes } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function Home() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        p: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5">Book an Appointment</Typography>
      <Typography variant="body2">
        Boilerplate ready. Add screens under <code>src/app/</code> and mount their
        routes here.
      </Typography>
    </Box>
  );
}

export function App() {
  return (
    <Routes>
      {/* Add feature routes here, e.g. <Route path="/login" element={<Login />} /> */}
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
