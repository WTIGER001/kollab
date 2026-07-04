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
  welcomeTitle?: string;
  welcomeText?: string;
  authLogoUrl?: string;
  authLogoSize?: string;
  legalDisclaimer?: string;
  authLoginButtonText?: string;
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
          welcomeTitle: cfg.welcomeTitle,
          welcomeText: cfg.welcomeText,
          authLogoUrl: cfg.authLogoUrl,
          authLogoSize: cfg.authLogoSize,
          legalDisclaimer: cfg.legalDisclaimer,
          authLoginButtonText: cfg.authLoginButtonText,
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
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)', fontFamily: 'var(--font-sans, sans-serif)' }}>
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
            <App 
              isMockMode={true} 
              welcomeTitle={config?.welcomeTitle}
              welcomeText={config?.welcomeText}
              authLogoUrl={config?.authLogoUrl}
              authLogoSize={config?.authLogoSize}
              legalDisclaimer={config?.legalDisclaimer}
            />
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
            <App 
              isMockMode={false} 
              welcomeTitle={config!.welcomeTitle}
              welcomeText={config!.welcomeText}
              authLogoUrl={config!.authLogoUrl}
              authLogoSize={config!.authLogoSize}
              legalDisclaimer={config!.legalDisclaimer}
              authLoginButtonText={config!.authLoginButtonText}
            />
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
