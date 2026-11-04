import type { CSSProperties } from "react";
import type { Theme } from "@/shared/content";
const fonts = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, Times New Roman, serif",
};
export function themeStyle(t: Theme): CSSProperties {
  return {
    "--color-background": t.background,
    "--color-surface": t.surface,
    "--color-text": t.text,
    "--color-muted": t.muted,
    "--color-primary": t.primary,
    "--color-accent": t.accent,
    "--color-border": t.border,
    "--font-body": fonts[t.fontBody],
    "--font-heading": fonts[t.fontHeading],
    "--font-scale": t.fontScale,
    "--content-width": `${t.contentWidth}px`,
    "--space-section": `${t.sectionSpacing}px`,
    "--card-gap": `${t.cardGap}px`,
    "--radius-card": `${t.radius}px`,
    "--card-border-style": t.borderStyle,
    "--heading-weight": t.headingWeight,
    "--card-shadow": t.shadow === "soft" ? "0 12px 38px #00000008" : "none",
  } as CSSProperties;
}
