import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeEngine } from './theme/ThemeEngine.tsx';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from 'react-oidc-context';
import './index.css'
import App from './App.tsx'
import { fetchOIDCConfig } from './services/api.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

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
    onSigninCallback: (user: any) => {
      const returnTo = user?.state || window.location.pathname;
      window.history.replaceState({}, document.title, returnTo);
    }
  };

  if (isMock) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeEngine>
          <CssBaseline />
          <BrowserRouter>
            <App isMockMode={true} />
          </BrowserRouter>
        </ThemeEngine>
      </QueryClientProvider>
    );
  }

  return (
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeEngine>
          <CssBaseline />
          <BrowserRouter>
            <App isMockMode={false} />
          </BrowserRouter>
        </ThemeEngine>
      </QueryClientProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
