# Technical Design: User Initials Avatar

This document specifies the technical design, properties, and initials calculation algorithm of the reusable `UserAvatar` component.

---

## 🎨 1. Component Overview

The `UserAvatar` component is a wrapper around the Material UI `<Avatar>` component. It is designed to ensure a consistent, premium display of user profiles throughout the Arkollab UI (e.g. comments, presence indicators, member lists, and dropdown menus).

---

## 🧮 2. Initials Extraction Algorithm

The initials are extracted from the user's full display name (or username) using a regex-based splitting utility `getInitials`. 

### Logic:
1. **Trim & Split**: Trim the input display name and split it into words by whitespace (`\s+`).
2. **First Character Mapping**: Extract the first character of each word.
3. **Join & Capitalize**: Join the characters and convert them to uppercase.
4. **Legibility Cap**: Slice the resulting initials to a maximum of **3 characters** to prevent overlap and maintain visual balance inside small UI avatar bubbles.

### Typescript Implementation:
```typescript
export const getInitials = (name: string): string => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3);
};
```

---

## ⚙️ 3. Component Interface & Styling

The component extends the standard MUI `AvatarProps` to inherit all native properties (e.g. `sx`, `onClick`, `src`), while replacing the child nodes with computed initials.

### Props:
```typescript
interface UserAvatarProps extends Omit<AvatarProps, "children"> {
  displayName: string;
}
```

### Style Integration:
- Uses the project's brand typography: `"Outfit", "Inter", sans-serif`.
- Uses a bold `fontWeight: 700` for clear legibility.
- Allows style extensions and color overwrites via standard MUI `sx` overrides.
