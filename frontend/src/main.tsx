import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from 'react-oidc-context'
import { theme } from './theme.ts'
import './index.css'
import App from './App.tsx'
import { fetchOIDCConfig } from './services/api.ts'

interface OidcConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
}

function Root() {
  const [config, setConfig] = useState<OidcConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOIDCConfig()
      .then((cfg) => {
        setConfig({
          authority: cfg.authority,
          clientId: cfg.clientId,
          redirectUri: cfg.redirectUri,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load OIDC configuration from backend, falling back to mock mode:", err);
        setConfig({
          authority: "https://mock-authority.logto.app/oidc",
          clientId: "mock-client-id",
          redirectUri: window.location.origin,
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0b10', color: '#8b5cf6', fontFamily: 'sans-serif' }}>
        Loading configuration...
      </div>
    );
  }

  const isMock = config?.clientId === "mock-client-id" || config?.authority.includes("mock");

  const oidcConfig = {
    authority: config!.authority,
    client_id: config!.clientId,
    redirect_uri: config!.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  if (isMock) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App isMockMode={true} />
      </ThemeProvider>
    );
  }

  return (
    <AuthProvider {...oidcConfig}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App isMockMode={false} />
      </ThemeProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
