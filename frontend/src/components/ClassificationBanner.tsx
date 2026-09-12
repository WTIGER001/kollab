import React from "react";
import type { SystemSettings } from "../services/api";

interface ClassificationBannerProps {
  systemSettings?: SystemSettings | null;
}

export const ClassificationBanner: React.FC<ClassificationBannerProps> = ({ systemSettings }) => {
  if (!systemSettings || !systemSettings.classificationBannerEnabled) {
    return null;
  }

  const text = systemSettings.classificationBannerText || "UNCLASSIFIED";
  const bgColor = systemSettings.classificationBannerBgColor?.startsWith("var(--")
    ? systemSettings.classificationBannerBgColor
    : "var(--primary-color)";
  const textColor = systemSettings.classificationBannerTextColor?.startsWith("var(--")
    ? systemSettings.classificationBannerTextColor
    : "var(--bg-color)";

  return (
    <div
      role="region"
      aria-label="Security Classification Banner"
      style={{
        width: "100%",
        height: "26px",
        flexShrink: 0,
        overflow: "hidden",
        whiteSpace: "nowrap",
        backgroundColor: `var(--classification-banner-bg, ${bgColor})`,
        color: `var(--classification-banner-text, ${textColor})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        userSelect: "none",
        zIndex: 9999,
        boxShadow: "var(--shadow-elevation)",
        "--classification-banner-bg": bgColor,
        "--classification-banner-text": textColor,
      } as React.CSSProperties}
    >
      {text}
    </div>
  );
};
