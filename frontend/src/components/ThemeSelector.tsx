import { getContrastRatio } from "@mui/material/styles";
import React from 'react';
import { 
  Card, CardContent, Typography, Box,
  Button} from '@mui/material';
import type { ThemePreset } from '../theme/types';

interface ThemeSelectorProps {
  activeThemeId: string;
  onSelectTheme: (id: string) => void;
  themeMode: 'light' | 'dark';
  presets: ThemePreset[];
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  activeThemeId, onSelectTheme, themeMode, presets
}) => {
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mt: 1 }}>
          {presets.map((preset) => {
            const colors = preset.colors[themeMode];
            const isActive = activeThemeId === preset.id;
            
            return (
              <Box key={preset.id} sx={{ width: '100%', minWidth: 0 }}>
                <Card
                  onClick={() => onSelectTheme(preset.id)}
                  sx={{ 
                    cursor: 'pointer',
                    width: '100%', textAlign: 'left', p: 0, height: '100%',
                    bgcolor: colors.background,
                    border: `2px solid ${isActive ? colors.primary : colors.border}`,
                    borderRadius: preset.cssVariables['--border-radius-card'],
                    boxShadow: isActive ? `0 0 0 2px ${colors.primary}40` : preset.cssVariables['--shadow-elevation'],
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: isActive ? colors.primary : colors.primary
                    }
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                    {/* Header preview */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: colors.primary }} />
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: colors.secondary }} />
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: colors.accent }} />
                    </Box>
                    
                    {/* Typography preview */}
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: colors.textPrimary,
                          fontFamily: preset.cssVariables['--font-headings'] || 'inherit',
                          fontWeight: 700,
                          fontSize: { xs: '16px', md: '20px' }, overflowWrap: 'anywhere',
                          mb: 0.5
                        }}
                      >
                        {preset.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        noWrap
                        sx={{ 
                          color: colors.textSecondary,
                          fontFamily: preset.cssVariables['--font-sans'] || 'inherit',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                      </Typography>
                    </Box>

                    {/* Component preview */}
                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      borderRadius: preset.cssVariables['--border-radius-card'],
                      bgcolor: colors.paper,
                      border: `${preset.cssVariables['--border-width']} ${preset.cssVariables['--border-style']} ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <Button 
                        variant="contained"
                        aria-label={`Select ${preset.name}`}
                        aria-pressed={isActive}
                        sx={{
                          minHeight: 44, minWidth: 0, width: "100%", fontSize: { xs: "12px", md: "14px" },
                          bgcolor: colors.primary, 
                          color: getContrastRatio(colors.primary, '#fff') >= 4.5 ? '#fff' : '#111',
                          borderRadius: preset.cssVariables['--border-radius-button'],
                          boxShadow: preset.cssVariables['--shadow-button'],
                          fontFamily: preset.cssVariables['--font-sans'] || 'inherit',
                          textTransform: preset.id === 'workbench' || preset.id === 'neobrutal' ? 'uppercase' : 'none',
                          fontWeight: preset.id === 'neobrutal' ? 800 : 600,
                          '&:hover': { bgcolor: colors.primary }
                        }}
                      >
                        Select
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
    </Box>
  );
};
