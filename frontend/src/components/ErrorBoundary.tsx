import React, { Component, ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button, Paper, Collapse } from "@mui/material";
import { AlertOctagon, ChevronDown, ChevronUp, RefreshCw, Copy } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in application:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  private handleCopy = () => {
    const errorText = `${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            minHeight: "100vh",
            width: "100vw",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0b10", // Sleek dark mode background
            p: 3,
            boxSizing: "border-box"
          }}
        >
          <Paper
            className="glass-card"
            sx={{
              p: 4,
              maxWidth: 600,
              width: "100%",
              borderRadius: "16px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              backgroundColor: "rgba(10, 11, 16, 0.7)",
              backdropFilter: "blur(16px)",
              color: "#fff",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.4)"
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box 
                sx={{ 
                  backgroundColor: "rgba(239, 68, 68, 0.1)", 
                  p: 2, 
                  borderRadius: "50%", 
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex"
                }}
              >
                <AlertOctagon size={40} style={{ color: "#ef4444" }} />
              </Box>
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 700,
                mb: 1,
                color: "#fff"
              }}
            >
              Something went wrong
            </Typography>

            <Typography
              variant="body2"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                color: "rgba(255, 255, 255, 0.7)",
                mb: 4,
                maxWidth: 450,
                mx: "auto"
              }}
            >
              An unexpected error occurred and the application had to stop. Try reloading the page.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshCw size={16} />}
                onClick={this.handleReload}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 600,
                  backgroundColor: "var(--primary-color, #8b5cf6)",
                  color: "#fff",
                  px: 3,
                  py: 1,
                  borderRadius: "8px",
                  "&:hover": {
                    backgroundColor: "color-mix(in srgb, var(--primary-color, #8b5cf6) 85%, #000)"
                  }
                }}
              >
                Reload Page
              </Button>

              <Button
                variant="outlined"
                endIcon={this.state.showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={this.toggleDetails}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 600,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "rgba(255, 255, 255, 0.7)",
                  px: 3,
                  py: 1,
                  borderRadius: "8px",
                  "&:hover": {
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)"
                  }
                }}
              >
                Error Details
              </Button>
            </Box>

            <Collapse in={this.state.showDetails}>
              <Paper
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  textAlign: "left",
                  overflowX: "auto",
                  maxHeight: 250,
                  overflowY: "auto",
                  position: "relative"
                }}
                className="scrollbar-thin"
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, position: 'sticky', top: 0 }}>
                  <Button
                    size="small"
                    onClick={this.handleCopy}
                    startIcon={<Copy size={12} />}
                    sx={{
                      color: "rgba(255, 255, 255, 0.7)",
                      textTransform: "none",
                      fontSize: "11px",
                      "&:hover": { color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.1)" }
                    }}
                  >
                    Copy Stack Trace
                  </Button>
                </Box>
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                    fontSize: "11px",
                    color: "#f87171",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {this.state.error?.toString()}
                  {"\n\nComponent Stack:\n"}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Paper>
            </Collapse>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
