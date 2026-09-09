import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Box, CircularProgress, Typography, Button } from "@mui/material";

interface AuthGuardProps {
  isMockMode: boolean;
  authMode?: "oidc" | "local";
  localSetupRequired?: boolean;
  localToken?: string | null;
  onLocalLogin?: (username: string, password: string) => Promise<void>;
  onInitialAdminSetup?: (user: { username: string; password: string; email: string; displayName: string }) => Promise<void>;
  welcomeTitle?: string;
  welcomeText?: string;
  authLogoUrl?: string;
  authLogoSize?: string;
  legalDisclaimer?: string;
  authLoginButtonText?: string;
  apiAuthError: boolean;
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  isMockMode,
  authMode = "oidc",
  localSetupRequired = false,
  localToken,
  onLocalLogin,
  onInitialAdminSetup,
  welcomeTitle,
  welcomeText,
  authLogoUrl,
  authLogoSize,
  legalDisclaimer,
  authLoginButtonText,
  apiAuthError,
  children
}) => {
	const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isMockMode && auth?.isAuthenticated && auth?.user?.expired) {
      auth.removeUser();
    }
  }, [auth?.isAuthenticated, auth?.user?.expired, isMockMode, auth]);

  if (!isMockMode && authMode === "oidc" && auth?.isLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isMockMode && authMode === "oidc" && auth?.error) {
    setTimeout(() => {
      auth.removeUser().then(() => {
        window.location.href = "/";
      });
    }, 2000);
    
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography color="error">Authentication Error: {auth.error.message}</Typography>
        <Typography color="text.secondary">Automatically clearing session and redirecting...</Typography>
        <Button variant="contained" onClick={() => { auth.removeUser(); window.location.href = "/"; }}>
          Force Clear Session
        </Button>
      </Box>
    );
  }

  if (apiAuthError) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography variant="h5" color="error">API Authentication Failed</Typography>
        <Typography color="text.secondary">The Go backend rejected your token with a 401 Unauthorized.</Typography>
        <Typography color="text.secondary">Please check your Go backend console for "JWT validation failed" to see exactly why it is rejecting the token.</Typography>
        <Button variant="contained" onClick={() => { auth?.removeUser(); window.location.href = "/"; }}>
          Clear Session & Restart
        </Button>
      </Box>
    );
  }

  if (!isMockMode && (authMode === "local" ? !localToken : !auth?.isAuthenticated)) {
    const submitLocalLogin = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!onLocalLogin) return;
      setIsSubmitting(true);
      setLoginError(null);
      try {
        await onLocalLogin(username, password);
      } catch {
        setLoginError("Invalid username or password.");
      } finally {
        setIsSubmitting(false);
      }
    };
    const submitInitialSetup = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!onInitialAdminSetup) return;
      setIsSubmitting(true);
      setLoginError(null);
      try {
        await onInitialAdminSetup({ username, password, displayName, email });
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : "Could not create the administrator.");
      } finally {
        setIsSubmitting(false);
      }
    };
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100vw', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'background.default',
        backgroundImage: 'radial-gradient(circle at 50% -20%, color-mix(in srgb, var(--primary-color) 15%, transparent) 0%, transparent 80%)',
        p: 4 
      }}>
        <Box sx={{ 
          p: 6, 
          borderRadius: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 4,
          bgcolor: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-elevation)',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)'
          }
        }}>
          {authLogoUrl && (
            <img 
              src={authLogoUrl} 
              alt="Workspace Logo" 
              style={{ 
                maxHeight: authLogoSize === "Small" ? 48 : authLogoSize === "Large" ? 120 : !isNaN(Number(authLogoSize)) ? Number(authLogoSize) : 80, 
                objectFit: 'contain' 
              }} 
            />
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {welcomeTitle && (
              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
                {welcomeTitle}
              </Typography>
            )}
            {welcomeText && (
              <Typography sx={{ color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1.5 }}>
                {welcomeText}
              </Typography>
            )}
            
            {!welcomeTitle && !welcomeText && !authLogoUrl && (
              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
                Kollab
              </Typography>
            )}
          </Box>

          {authMode === "local" ? (
            <Box component="form" onSubmit={localSetupRequired ? submitInitialSetup : submitLocalLogin} sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
              {localSetupRequired && <Typography sx={{ color: "var(--text-secondary)", textAlign: "left" }}>Create the first administrator for this Kollab installation.</Typography>}
              <input aria-label="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required style={{ padding: 12, borderRadius: "var(--border-radius-button)", border: "1px solid var(--border-color)", background: "var(--panel-color)", color: "var(--text-primary)" }} />
              {localSetupRequired && <input aria-label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" style={{ padding: 12, borderRadius: "var(--border-radius-button)", border: "1px solid var(--border-color)", background: "var(--panel-color)", color: "var(--text-primary)" }} />}
              {localSetupRequired && <input aria-label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" style={{ padding: 12, borderRadius: "var(--border-radius-button)", border: "1px solid var(--border-color)", background: "var(--panel-color)", color: "var(--text-primary)" }} />}
              <input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required style={{ padding: 12, borderRadius: "var(--border-radius-button)", border: "1px solid var(--border-color)", background: "var(--panel-color)", color: "var(--text-primary)" }} />
              {loginError && <Typography color="error" variant="body2">{loginError}</Typography>}
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? "Working…" : localSetupRequired ? "Create administrator" : "Sign in"}</Button>
            </Box>
          ) : <Button
            variant="contained" 
            size="large"
            onClick={() => auth?.signinRedirect({ state: window.location.pathname })}
            sx={{ 
              mt: 1, 
              width: '100%', 
              py: 1.5, 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              fontFamily: '"Outfit", sans-serif',
              borderRadius: 'var(--border-radius-button)',
              textTransform: 'none',
              boxShadow: 'var(--shadow-button)'
            }}
          >
            {authLoginButtonText || "Log In to Workspace"}
          </Button>}

          {legalDisclaimer && (
            <Typography variant="caption" sx={{ color: 'text.disabled', mt: 2, display: 'block', px: 2, lineHeight: 1.5 }}>
              {legalDisclaimer}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};
