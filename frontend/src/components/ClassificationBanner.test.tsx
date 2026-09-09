import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClassificationBanner } from './ClassificationBanner';
import type { SystemSettings } from '../services/api';

const mockSystemSettings: SystemSettings = {
  auditRetentionPolicy: '30days',
  auditRetentionCustomDays: 30,
  auditLogDestination: 'database',
  trashRetentionPolicy: 'forever',
  trashRetentionCustomDays: 30,
  welcomeTitle: 'Welcome',
  welcomeText: 'Welcome text',
  authLogoUrl: '',
  authLogoSize: 'Medium',
  authLegalDisclaimer: '',
  authLoginButtonText: 'Login',
  aiRateLimit: 10,
  asposeEnabled: false,
  asposeLicense: '',
  classificationBannerEnabled: true,
  classificationBannerText: 'CONFIDENTIAL',
  classificationBannerBgColor: 'var(--secondary-color)',
  classificationBannerTextColor: 'var(--bg-color)',
};

describe('ClassificationBanner', () => {
  it('renders nothing when systemSettings is null or banner is disabled', () => {
    const { container } = render(<ClassificationBanner systemSettings={null} />);
    expect(container.firstChild).toBeNull();

    const { container: containerDisabled } = render(
      <ClassificationBanner systemSettings={{ ...mockSystemSettings, classificationBannerEnabled: false }} />
    );
    expect(containerDisabled.firstChild).toBeNull();
  });

  it('renders security banner with theme-variable colors when enabled', () => {
    render(<ClassificationBanner systemSettings={mockSystemSettings} />);

    const banner = screen.getByRole('region', { name: /Security Classification Banner/i });
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('CONFIDENTIAL');
    expect(banner).toHaveStyle({ '--classification-banner-bg': 'var(--secondary-color)' });
  });

  it('falls back to theme variables instead of rendering a persisted literal color', () => {
    render(<ClassificationBanner systemSettings={{ ...mockSystemSettings, classificationBannerBgColor: '#d32f2f' }} />);

    expect(screen.getByRole('region', { name: /Security Classification Banner/i }))
      .toHaveStyle({ '--classification-banner-bg': 'var(--primary-color)' });
  });
});
