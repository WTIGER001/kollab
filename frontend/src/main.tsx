import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeEngine } from './theme/ThemeEngine.tsx';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from 'react-oidc-context';
import './index.css'
import App from './App.tsx'
import { StartupScreen } from './components/StartupScreen'
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
  authMode?: "oidc" | "local";
  localSetupRequired?: boolean;
  authority: string;
  clientId: string;
  redirectUri: string;
  apiAudience?: string;
  apiScope?: string;
  welcomeTitle?: string;
  welcomeText?: string;
  authLogoUrl?: string;
  authLogoSize?: string;
  legalDisclaimer?: string;
  authLoginButtonText?: string;
}

function Root() {
  const [config, setConfig] = useState<OidcConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localToken, setLocalToken] = useState<string | null>(() => sessionStorage.getItem("kollab.localToken"));

  useEffect(() => {
    fetchOIDCConfig()
      .then((cfg) => {
        setConfig({
          authority: cfg.authority,
          clientId: cfg.clientId,
          authMode: cfg.authMode,
          localSetupRequired: cfg.localSetupRequired,
          redirectUri: cfg.redirectUri,
          apiAudience: cfg.apiAudience,
          apiScope: cfg.apiScope,
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
        console.error("Failed to load authentication configuration:", err);
        setConfigError(true);
        setLoading(false);
      });
  }, []);

  if (loading) return <StartupScreen />;
  if (configError || !config) return <StartupScreen failed onRetry={() => window.location.reload()} />;

  const authMode = config?.authMode || "local";
  const isMock = authMode !== "local" && (config?.clientId === "mock-client-id" || config?.authority.includes("mock"));

  const oidcConfig = {
    authority: config!.authority,
    client_id: config!.clientId,
    redirect_uri: config!.redirectUri,
    response_type: "code",
    scope: ["openid", "profile", "email", config!.apiScope].filter(Boolean).join(" "),
    onSigninCallback: (user: any) => {
      const returnTo = user?.state || window.location.pathname;
      window.history.replaceState({}, document.title, returnTo);
    }
  };

  return (
    <AuthProvider {...oidcConfig}>
          <BrowserRouter>
            <App
              isMockMode={isMock}
              authMode={authMode}
              localSetupRequired={config?.localSetupRequired}
              localToken={localToken}
              onLocalToken={(token) => { setLocalToken(token); if (token) sessionStorage.setItem("kollab.localToken", token); else sessionStorage.removeItem("kollab.localToken"); }}
              welcomeTitle={config!.welcomeTitle}
              welcomeText={config!.welcomeText}
              authLogoUrl={config!.authLogoUrl}
              authLogoSize={config!.authLogoSize}
              legalDisclaimer={config!.legalDisclaimer}
              authLoginButtonText={config!.authLoginButtonText}
            />
          </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeEngine>
          <CssBaseline />
          <Root />
        </ThemeEngine>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
