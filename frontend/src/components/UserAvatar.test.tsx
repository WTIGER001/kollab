import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar, getInitials } from './UserAvatar';

describe('getInitials', () => {
  it('returns "?" for empty strings', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns "?" for falsy values', () => {
    // @ts-expect-error testing invalid input
    expect(getInitials(null)).toBe('?');
    // @ts-expect-error testing invalid input
    expect(getInitials(undefined)).toBe('?');
  });

  it('returns the first letter for a single word', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('returns first letters for multiple words up to 3', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('John Paul Jones')).toBe('JPJ');
    expect(getInitials('John Paul Jones Junior')).toBe('JPJ');
  });

  it('handles extra whitespace correctly', () => {
    expect(getInitials('  Alice   Bob  ')).toBe('AB');
  });

  it('always returns uppercase', () => {
    expect(getInitials('charlie brown')).toBe('CB');
  });
});

describe('UserAvatar', () => {
  it('renders the avatar with initials', () => {
    render(<UserAvatar displayName="Alice Smith" />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('passes additional props to the Avatar component', () => {
    render(<UserAvatar displayName="Bob" data-testid="user-avatar" />);
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
