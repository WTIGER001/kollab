import React from "react";
import { Avatar } from "@mui/material";
import type { AvatarProps } from "@mui/material";

export const getInitials = (name: string): string => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3); // limit to 3 letters to keep it visually clean in small layout items
};

interface UserAvatarProps extends Omit<AvatarProps, "children"> {
  displayName: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ displayName, sx, ...props }) => {
  const initials = getInitials(displayName);
  
  return (
    <Avatar
      sx={{
        fontFamily: '"Outfit", "Inter", sans-serif',
        fontWeight: 700,
        ...sx,
      }}
      {...props}
    >
      {initials}
    </Avatar>
  );
};
