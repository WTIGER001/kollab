const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const channels = (value: string): [number, number, number] => {
  const hex = value.trim().slice(1);
  const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16)) as [number, number, number];
};

const linear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const contrastRatio = (foreground: string, background: string) => {
  const luminance = (color: string) => {
    const [red, green, blue] = channels(color);
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
};

export const readableForeground = (background: string) =>
  contrastRatio("#ffffff", background) >= contrastRatio("#111111", background) ? "#ffffff" : "#111111";

const mix = (source: string, toward: string, sourceWeight: number) => {
  const from = channels(source);
  const to = channels(toward);
  const mixed = from.map((channel, index) => Math.round(channel * sourceWeight + to[index] * (1 - sourceWeight)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

/** Keep the source color, mixing it toward `toward` only until every hex surface reaches WCAG AA. */
export const readableOn = (source: string, toward: string, backgrounds: string[], start = 1) => {
  const surfaces = backgrounds.filter((background) => HEX.test(background));
  for (let weight = start; weight >= 0; weight -= 0.02) {
    const color = weight >= 0.999 ? source : mix(source, toward, Math.max(weight, 0));
    if (surfaces.every((background) => contrastRatio(color, background) >= 4.5)) return color;
  }
  return toward;
};
