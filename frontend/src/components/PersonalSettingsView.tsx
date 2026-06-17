import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab
} from "@mui/material";
import { User, Sun, Moon, ArrowLeft, Paintbrush } from "lucide-react";
import { TagsManager } from "./TagsManager";

interface PersonalSettingsViewProps {
  displayName: string;
  username: string;
  themeMode: "light" | "dark";
  onUpdateThemeMode: (mode: "light" | "dark") => void;
  onBack: () => void;
  personalPagesCount: number;
}

export const PersonalSettingsView: React.FC<PersonalSettingsViewProps> = ({
  displayName,
  username,
  themeMode,
  onUpdateThemeMode,
  onBack,
  personalPagesCount
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ 
      flex: 1, 
      height: "100%", 
      overflowY: "auto", 
      bgcolor: "background.default",
      px: { xs: 2, sm: 3, md: 4 },
      py: 3,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }} className="scrollbar-thin">
      
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onBack}
          startIcon={<ArrowLeft size={14} />}
          sx={{
            color: "text.secondary",
            borderColor: "var(--border-color)",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "12px",
            fontFamily: '"Outfit", sans-serif',
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)"
            }
          }}
        >
          Back to Portal
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
          Personal Settings
        </Typography>
      </Box>

      {/* Tabs Selector */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              fontSize: "13.5px",
              minWidth: 100
            }
          }}
        >
          <Tab label="General" />
          <Tab label="Tags" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 4 }}>
          {/* Left Side: Preferences */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Paintbrush size={18} style={{ color: "var(--primary-color)" }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                    Preferences & Appearance
                  </Typography>
                </Box>

                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: "13px", fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
                    Select Theme Mode
                  </FormLabel>
                  <RadioGroup
                    row
                    value={themeMode}
                    onChange={(e) => onUpdateThemeMode(e.target.value as "light" | "dark")}
                  >
                    <FormControlLabel 
                      value="light" 
                      control={<Radio size="small" />} 
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: "13.5px", fontFamily: '"Outfit", sans-serif' }}>
                          <Sun size={14} style={{ color: "#d97706" }} />
                          Light Theme
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value="dark" 
                      control={<Radio size="small" />} 
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: "13.5px", fontFamily: '"Outfit", sans-serif' }}>
                          <Moon size={14} style={{ color: "#a855f7" }} />
                          Dark Theme
                        </Box>
                      } 
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            </Box>
          </Box>

          {/* Right Side: Account / Space Details */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <User size={18} style={{ color: "var(--accent-blue)" }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                    Account Space Info
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                      Display Name
                    </Typography>
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                      {displayName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                      Username
                    </Typography>
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                      {username}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                      Private Personal Pages
                    </Typography>
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                      {personalPagesCount} {personalPagesCount === 1 ? "page" : "pages"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <TagsManager />
      )}
    </Box>
  );
};
