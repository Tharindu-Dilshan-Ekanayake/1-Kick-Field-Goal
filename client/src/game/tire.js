import { Color } from 'three'

/**
 * Each ball's colours, by ball id (the ids are the template's tire ids, kept for old
 * saves; names and stats live in shared/balance.js, and what each ball looks like is
 * ball.js's BALL_STYLES). `glow` tints a ball's trail, dust, speed lines and halos; `rim`
 * is its showroom pedestal's cap; `rubber` is the ball's base colour and `accent` its
 * design colour.
 */
export const TIRE_STYLES = {
  bicycle: { rubber: '#9a5226', rim: '#c8743a', accent: '#ffffff', glow: '#ff9a4a' },
  mountain: { rubber: '#ffffff', rim: '#e8eef8', accent: '#15171c', glow: '#dfe9ff' },
  wood: { rubber: '#d2f21c', rim: '#d4f21f', accent: '#ffffff', glow: '#e4ff4a' },
  stone: { rubber: '#ff7a1a', rim: '#ff7a1a', accent: '#1b1b1f', glow: '#ff9a4a' },
  cookie: { rubber: '#ffd21f', rim: '#ffd21f', accent: '#2f7bff', glow: '#6aa8ff' },
  pizza: { rubber: '#fbf7ee', rim: '#fbf7ee', accent: '#d8222a', glow: '#ff6a6a' },
  donut: { rubber: '#ff3b3b', rim: '#ff5a5a', accent: '#ffd21f', glow: '#ffd84a' },
  watermelon: { rubber: '#101528', rim: '#5b2cff', accent: '#33d6ff', glow: '#8a6aff' },
  monster: { rubber: '#d83a2f', rim: '#d83a2f', accent: '#ffffff', glow: '#ff6a4a' },
  mint: { rubber: '#ffffff', rim: '#f4f7ff', accent: '#9db2c8', glow: '#d8e6ff' },
  silver: { rubber: '#cfd6e2', rim: '#d6dde8', accent: '#7d8aa0', glow: '#e8f0ff' },
  ice: { rubber: '#c9f1ff', rim: '#9fe0ff', accent: '#5fb6ee', glow: '#bff4ff' },
  gold: { rubber: '#ffc81a', rim: '#ffd21f', accent: '#d68500', glow: '#ffd21f' },
  lava: { rubber: '#3a1410', rim: '#ff6a1e', accent: '#ffd21f', glow: '#ff4a1c' },
  platinum: { rubber: '#e6edf5', rim: '#e6edf5', accent: '#2f6bff', glow: '#7aa6ff' },
  emerald: { rubber: '#3be08a', rim: '#3be08a', accent: '#0a7d3a', glow: '#7dffb0' },
  ruby: { rubber: '#ff4a6a', rim: '#ff4a6a', accent: '#8a0a26', glow: '#ff7a90' },
  diamond: { rubber: '#bff0ff', rim: '#bff0ff', accent: '#3fb8ff', glow: '#bff4ff' },
  rainbow: { rubber: '#ff5fd2', rim: '#ff7ad9', accent: '#ffffff', glow: '#ff7ad9' },
  unicorn: { rubber: '#ffd1f0', rim: '#ffb0f0', accent: '#b9d8ff', glow: '#ffb0f0' },
  galaxy: { rubber: '#140c2a', rim: '#a46bff', accent: '#5fd6ff', glow: '#a46bff' },
  dragon: { rubber: '#1f9a4a', rim: '#4cff7a', accent: '#ffd21f', glow: '#4cff7a' },
  cosmic: { rubber: '#0b1738', rim: '#ff3d8a', accent: '#ffd24a', glow: '#ff9ed8' },
  infinity: { rubber: '#ffffff', rim: '#ffffff', accent: '#ffffff', glow: '#ffffff' },
}

// Parsed once, so frame code can look colours up without allocating.
const parse = (key) => Object.fromEntries(Object.entries(TIRE_STYLES).map(([id, s]) => [id, new Color(s[key])]))
const RUBBERS = parse('rubber')
const RIMS = parse('rim')
const ACCENTS = parse('accent')
const GLOWS = parse('glow')

export const tireRubber = (id) => RUBBERS[id] || RUBBERS.bicycle
export const tireRim = (id) => RIMS[id] || RIMS.bicycle
export const tireAccent = (id) => ACCENTS[id] || ACCENTS.bicycle
export const tireGlow = (id) => GLOWS[id] || GLOWS.bicycle
