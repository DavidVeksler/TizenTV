// Samsung remote key codes; desktop fallbacks let the app be developed in a browser.
export const Key = {
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  Enter: 13,
  Back: 10009,
  BackDesktop: 27, // Escape
  Red: 403,
  RedDesktop: 68, // "d"
  Green: 404,
  GreenDesktop: 84, // "t" cycles timeframe
  Yellow: 405,
  YellowDesktop: 83, // "s" cycles tile size metric
} as const;

declare const tizen: any;

export function registerRemoteKeys(): void {
  try {
    // Arrows/Enter/Back are delivered by default; colour keys must be registered.
    for (const k of ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow']) tizen.tvinputdevice.registerKey(k);
  } catch {
    // Not on a TV (desktop browser) or privilege missing.
  }
}
