import { Box, Button, CircularProgress, Typography } from '@mui/material';

export function StartupScreen({ failed = false, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  return <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
    <Box role={failed ? 'alert' : 'status'} sx={{ maxWidth: 480, width: '100%', p: 4, bgcolor: 'var(--panel-color)', border: 'var(--border-width) var(--border-style) var(--border-color)', borderRadius: 'var(--border-radius-card)', boxShadow: 'var(--shadow-elevation)' }}>
      {!failed && <CircularProgress size={24} sx={{ color: 'var(--primary-color)', mb: 2 }} />}
      <Typography component="h1" variant="h5" sx={{ color: 'var(--text-primary)', mb: 1 }}>{failed ? 'Unable to connect to Kollab' : 'Connecting to Kollab'}</Typography>
      <Typography sx={{ color: 'var(--text-secondary)' }}>{failed ? 'The server configuration could not be loaded. Wait for the server to finish starting, then try again. If this continues, check the development terminal for a startup error.' : 'Loading server configuration…'}</Typography>
      {failed && <Button variant="contained" onClick={onRetry} sx={{ mt: 3, bgcolor: 'var(--primary-color)', color: 'var(--primary-contrast)', borderRadius: 'var(--border-radius-button)', boxShadow: 'var(--shadow-button)', '&:hover': { bgcolor: 'var(--primary-color)' } }}>Try again</Button>}
    </Box>
  </Box>;
}
