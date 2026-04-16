const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Converts a hex color string to an rgba string while applying the desired alpha channel.
 * Accepts short (#fff) or long (#ffffff) hex formats. Returns the original color when the value
 * cannot be parsed as hex so the caller can decide how to handle non-hex inputs.
 */
export const hexToRgba = (hexColor: string, alpha: number): string => {
  const normalized = hexColor.trim().replace("#", "");
  const clampedAlpha = clamp(alpha, 0, 1);

  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0]?.repeat(2) ?? "00", 16);
    const g = Number.parseInt(normalized[1]?.repeat(2) ?? "00", 16);
    const b = Number.parseInt(normalized[2]?.repeat(2) ?? "00", 16);
    return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
  }

  if (normalized.length === 6) {
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
  }

  return hexColor;
};

/**
 * Applies an alpha multiplier to any CSS color. Hex strings are converted to rgba. For other color
 * formats we fall back to the CSS `color-mix` function to blend the color with transparency.
 */
export const withAlpha = (color: string, alpha: number): string => {
  const trimmed = color.trim();
  const clampedAlpha = clamp(alpha, 0, 1);

  if (HEX_PATTERN.test(trimmed)) {
    return hexToRgba(trimmed, clampedAlpha);
  }

  const percentage = Math.round(clampedAlpha * 100);
  return `color-mix(in srgb, ${trimmed} ${percentage}%, transparent)`;
};
