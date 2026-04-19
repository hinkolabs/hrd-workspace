import type { DesignPreset, SlideStyle } from "./types";
import { PPT_THEMES } from "@/lib/ppt-themes";
import hanaSecurities from "./hana-report-clean";

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PRESETS: DesignPreset[] = [hanaSecurities];

export const DEFAULT_PRESET_ID = "hana-report-clean";

export function getPreset(id?: string | null): DesignPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}

// ─── Style resolution ─────────────────────────────────────────────────────────

/**
 * Merges a DesignPreset with its base PptTheme to produce a fully resolved
 * SlideStyle that every slide builder receives.
 *
 * Color/font tokens in the preset override the base theme values; anything
 * not specified falls back to the base theme.
 */
export function resolveStyle(preset: DesignPreset): SlideStyle {
  const base = PPT_THEMES[preset.baseTheme as keyof typeof PPT_THEMES]
    ?? PPT_THEMES.hana;

  return {
    colors: { ...base.colors, ...preset.tokens.colors } as SlideStyle["colors"],
    fonts: {
      ...base.fonts,
      ...preset.tokens.fonts,
    } as SlideStyle["fonts"],
    chrome: preset.chrome,
    titleSlide: preset.titleSlide,
    sectionSlide: preset.sectionSlide,
  };
}

export type { DesignPreset, SlideStyle };
