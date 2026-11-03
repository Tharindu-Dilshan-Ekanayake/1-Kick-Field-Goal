import { CylinderGeometry, SphereGeometry, TorusGeometry } from 'three'

import {
  COURT_BACK_X,
  COURT_HALF,
  PAD_COUNT,
  PAD_HEIGHT,
  PAD_RADIUS,
  PAD_X,
  padCenterZ,
  SHOP_SIGN,
  SHOP_SIGN_FACING,
  SHOP_STAGES,
  TABLE_NEAR_X,
} from '@shared/world'

import { STYLE } from '../materials'
import { venueOf } from '../sceneStyle'

/**
 * Static lobby structures, added to the world's shared BlockSet and prop builder so they
 * render in the same few draw calls as the grandstands.
 */

/**
 * Per-pad look, in pad order (matches PADS in shared/balance.js): the mat's base, top,
 * glowing ring and centre emblem, the treadmill's side rails and its console screen, the
 * track floor beyond it, and the colour of its labels. `beach` ones (Palm Beach's surf
 * treadmills) have surfboards for rails, a wave-blue belt and a surfboard and palm on top.
 */
export const PAD_THEMES = [
  { base: '#1f5fc8', top: '#3f9cff', ring: '#9fe8ff', emblem: '#ffffff', rail: '#1d5fd6', court: '#2c4fa8', screen: '#5fd6ff', text: '#5fd6ff' },
  { base: '#b8222e', top: '#ff3b3b', ring: '#ffd21f', emblem: '#1d1f22', rail: '#c8323c', court: '#a8323c', screen: '#ffd21f', text: '#ff7a6a' },
  { base: '#d64a9a', top: '#ff8fd0', ring: '#ffffff', emblem: '#ffd23f', rail: '#d63f8f', court: '#b8467e', screen: '#ffffff', text: '#ff9cd6' },
  { base: '#1d3f8a', top: '#2f6fe0', ring: '#7fe2ff', emblem: '#ffd21f', rail: '#173b8f', court: '#26408a', screen: '#7fe2ff', text: '#7fb8ff' },
  { base: '#5a2a9a', top: '#8a4cff', ring: '#ff7ad9', emblem: '#ffffff', rail: '#6a2fd0', court: '#4a2a8a', screen: '#ff7ad9', text: '#c69bff' },
  { base: '#1a8ab8', top: '#7ff0ff', ring: '#ffffff', emblem: '#9b6bff', rail: '#14a3c9', court: '#1f7aa8', screen: '#ffffff', text: '#9fe8ff', style: STYLE.GLOW },
  { base: '#1b2266', top: '#2a1450', ring: '#c35cff', emblem: '#ffd21f', rail: '#2a1450', court: '#1b1f5c', screen: '#ffd21f', text: '#d39bff', style: STYLE.GALAXY },
  // Palm Beach's beach treadmills: sand and surf, then a deep-sea wave.
  { base: '#e8c27a', top: '#ffe29a', ring: '#3fd8ff', emblem: '#ff7a3a', rail: '#2fb8e0', court: '#d9b46a', screen: '#3fd8ff', text: '#5fe6ff', beach: true },
  { base: '#0b4f8a', top: '#1a8fd8', ring: '#7ff6ff', emblem: '#ffffff', rail: '#0a6fb8', court: '#0b3f72', screen: '#7ff6ff', text: '#7ff6ff', style: STYLE.GLOW, beach: true },
]

const LINE = '#f4f7fb'
const LEG = '#3a3f4a'
const BELT = '#23262f'
/** The multiplier backboard: high above the runner's head, and compact. Labels centre on it (lobbyLabels). */
export const BOARD_BOTTOM = 4.8
export const BOARD_HEIGHT = 3.6

const DISC = new CylinderGeometry(1, 1, 1, 24)
const RING = new TorusGeometry(1, 0.08, 4, 28)
const CYL = new CylinderGeometry(1, 1, 1, 12)
const BALL = new SphereGeometry(1, 12, 8)

/**
 * A pad's running track, east of its mat: a coloured floor with white lines and a low
 * barrier at the back. Boxes go in `blocks`: no draw calls of their own. (The treadmill
 * itself stands on the mat and just east of it: buildTreadmill.)
 */
function buildCourt(blocks, z, theme) {
  const courtLength = COURT_BACK_X - (TABLE_NEAR_X - 0.4)
  const courtX = (TABLE_NEAR_X - 0.4 + COURT_BACK_X) / 2
  blocks.addOn(courtX, 0, z, courtLength, 0.05, COURT_HALF * 2, theme.court, STYLE.SMOOTH)
  // Its lines stand 4 cm proud of the floor (nothing within 3 cm of another surface).
  for (const s of [-1, 1]) blocks.addOn(courtX, 0.05, z + s * (COURT_HALF - 0.15), courtLength - 0.3, 0.04, 0.12, LINE, STYLE.SMOOTH)
  blocks.addOn(COURT_BACK_X - 0.3, 0.05, z, 0.12, 0.04, COURT_HALF * 2 - 0.42, LINE, STYLE.SMOOTH)

  // The barrier across the back: panels in two colours with a glowing top.
  for (let i = 0; i < 3; i += 1) {
    const pz = z - COURT_HALF + (i + 0.5) * ((COURT_HALF * 2) / 3)
    blocks.addOn(COURT_BACK_X, 0, pz, 0.22, 0.75, (COURT_HALF * 2) / 3 - 0.06, i % 2 ? theme.top : '#1f2a5c', STYLE.SMOOTH)
  }
  blocks.addOn(COURT_BACK_X, 0.75, z, 0.26, 0.08, COURT_HALF * 2, theme.ring, STYLE.GLOW)
}

/**
 * The treadmill under the runner's feet (the runner stands at the mat's centre facing
 * east): a dark belt whose ribs slide back under them (STYLE.BELT, animated by the
 * shader's clock - no per-frame work here), side rails in the pad's colour with a glowing
 * edge, a roller at each end, then east of the mat the console - a post with a glowing
 * screen and two handrails back towards the runner - and, behind it, the big backboard
 * the pad's multiplier label (labels/lobbyLabels.js) hangs in front of.
 *
 * Everything east of x = TABLE_NEAR_X stays inside the pad's static collider
 * (shared/world.js), so what you can't walk through is what's drawn.
 */
function buildTreadmill(blocks, props, z, theme) {
  const top = PAD_HEIGHT
  // The belt, its two side rails with a glowing edge (or, on a surf treadmill, a
  // surfboard each side with a white stripe), and a roller at each end.
  blocks.addOn(PAD_X, top, z, 4.2, 0.05, 1.5, theme.beach ? '#123f66' : BELT, STYLE.BELT)
  for (const s of [-1, 1]) {
    if (theme.beach) {
      props.add(BALL, { position: [PAD_X, top + 0.1, z + s * 0.97], scale: [2.45, 0.14, 0.36], color: theme.rail })
      props.add(BALL, { position: [PAD_X, top + 0.1, z + s * 0.97], scale: [2.0, 0.15, 0.08], color: '#ffffff' })
    } else {
      blocks.addOn(PAD_X, top, z + s * 0.92, 4.6, 0.16, 0.34, theme.rail, STYLE.SMOOTH)
      blocks.addOn(PAD_X, top + 0.16, z + s * 0.92, 4.4, 0.04, 0.12, theme.ring, STYLE.GLOW)
    }
    props.add(CYL, { position: [PAD_X + s * 2.15, top + 0.1, z], rotation: [Math.PI / 2, 0, 0], scale: [0.14, 1.5, 0.14], color: LEG })
  }

  // The console: a post from the ground with a glowing screen, a button and a handrail
  // each side back towards the runner at hand height.
  const cx = PAD_X + 3.2
  blocks.addOn(cx, 0, z, 0.9, 0.12, 1.8, LEG, STYLE.SMOOTH)
  blocks.addOn(cx, 0.12, z, 0.3, 1.5, 0.4, theme.rail, STYLE.SMOOTH)
  blocks.addOn(cx - 0.05, 1.55, z, 0.3, 0.9, 1.5, '#2a2f3a', STYLE.SMOOTH)
  blocks.addOn(cx - 0.22, 1.7, z, 0.05, 0.6, 1.2, theme.screen, STYLE.GLOW)
  blocks.addOn(cx - 0.22, 1.62, z, 0.07, 0.07, 0.5, '#ffffff', STYLE.GLOW)
  props.add(BALL, { position: [cx - 0.2, 1.62, z + 0.55], scale: 0.09, color: '#ff3b3b', style: STYLE.GLOW })
  for (const s of [-1, 1]) {
    blocks.addOn(cx - 1.2, 1.3, z + s * 0.95, 2.5, 0.1, 0.12, LEG, STYLE.SMOOTH)
    blocks.addOn(cx - 2.4, top, z + s * 0.95, 0.12, 1.4 - top, 0.12, LEG, STYLE.SMOOTH)
    blocks.addOn(cx - 0.05, 0.12, z + s * 0.95, 0.14, 1.2, 0.14, LEG, STYLE.SMOOTH)
  }

  // The backboard behind the console, kept small and high so the follow camera behind the
  // runner (west of the mat, looking east) sees it over their head rather than a wall of it:
  // a navy panel in a rail-coloured frame with a glowing border in the pad's ring colour, on
  // two thin posts, a football crest on top.
  const bx = PAD_X + 5.6
  const by = BOARD_BOTTOM
  const bh = BOARD_HEIGHT
  for (const s of [-1, 1]) blocks.addOn(bx, 0, z + s * 1.5, 0.25, by, 0.25, LEG, STYLE.SMOOTH)
  blocks.addOn(bx, by, z, 0.4, bh, 4.2, theme.rail, STYLE.SMOOTH)
  blocks.addOn(bx - 0.23, by + 0.2, z, 0.08, bh - 0.4, 3.8, '#141a3a', STYLE.SMOOTH)
  blocks.addOn(bx - 0.28, by + 0.12, z, 0.06, 0.1, 3.9, theme.ring, STYLE.GLOW)
  blocks.addOn(bx - 0.28, by + bh - 0.22, z, 0.06, 0.1, 3.9, theme.ring, STYLE.GLOW)
  for (const s of [-1, 1]) blocks.addOn(bx - 0.28, by + 0.2, z + s * 1.9, 0.06, bh - 0.4, 0.1, theme.ring, STYLE.GLOW)
  if (theme.beach) {
    // A surfboard standing on end on top, and a little palm beside it.
    props.add(BALL, { position: [bx, by + bh + 1.0, z - 0.7], scale: [0.14, 0.95, 0.34], color: theme.ring })
    props.add(BALL, { position: [bx, by + bh + 1.0, z - 0.7], scale: [0.15, 0.8, 0.07], color: '#ffffff' })
    blocks.addOn(bx, by + bh, z + 0.9, 0.22, 1.5, 0.22, '#9a6a3a', STYLE.SMOOTH)
    blocks.add(bx, by + bh + 1.62, z + 0.9, 1.6, 0.18, 0.5, '#2fae4a', STYLE.SMOOTH, 0.4)
    blocks.add(bx, by + bh + 1.66, z + 0.9, 0.5, 0.16, 1.6, '#4cd36a', STYLE.SMOOTH, 0.4)
  } else {
    // A little football on top: a brown ellipsoid with a white stripe at each end.
    props.add(BALL, { position: [bx, by + bh + 0.5, z], scale: [0.4, 0.34, 0.62], color: '#8a4a24' })
    for (const s of [-1, 1]) props.add(BALL, { position: [bx - 0.05, by + bh + 0.5, z + s * 0.27], scale: [0.42, 0.35, 0.05], color: '#ffffff' })
  }
}

/**
 * The training spots: round two-tier mats in the pad's colours with a glowing ring round
 * the top, each with its treadmill on and beside it and a running track beyond. The
 * rounded parts go into the world's props, the rest into its blocks: no draw calls of
 * their own.
 */
export function buildPads(blocks, props) {
  for (let i = 0; i < PAD_COUNT; i += 1) {
    const theme = PAD_THEMES[i]
    const z = padCenterZ(i)
    const r = PAD_RADIUS
    props.add(DISC, { position: [PAD_X, PAD_HEIGHT * 0.4, z], scale: [r + 0.45, PAD_HEIGHT * 0.8, r + 0.45], color: theme.base })
    props.add(DISC, { position: [PAD_X, PAD_HEIGHT - 0.06, z], scale: [r, 0.14, r], color: theme.top, style: theme.style ?? STYLE.STUDS })
    props.add(RING, { position: [PAD_X, PAD_HEIGHT + 0.02, z], rotation: [Math.PI / 2, 0, 0], scale: [r - 0.25, r - 0.25, 1], color: theme.ring, style: STYLE.GLOW })
    // The mat's emblem: a small football on a disc, either side of the belt's start.
    for (const s of [-1, 1]) {
      props.add(CYL, { position: [PAD_X - 1.9, PAD_HEIGHT + 0.03, z + s * 1.6], scale: [0.46, 0.04, 0.46], color: theme.emblem === '#1d1f22' ? '#ffffff' : theme.emblem })
      props.add(BALL, { position: [PAD_X - 1.9, PAD_HEIGHT + 0.14, z + s * 1.6], scale: [0.4, 0.14, 0.22], color: '#8a4a24' })
    }
    buildTreadmill(blocks, props, z, theme)
    buildCourt(blocks, z, theme)
  }
}

const WHITE = '#f4f7fb'

/**
 * The ball shop: two open display stages (the stands on them are TireShop's) and the big
 * BALL SHOP sign behind, built like the start arch - white decks on a yellow band with
 * gold light strips round the edges. `detail` (off on LOW) adds the sign's bulbs.
 *
 * No two faces here share a plane: every layer stands a clear step proud of what it
 * sits on.
 */
export function buildShop(blocks, { detail = true, world = 0 } = {}) {
  const { band: YELLOW, strip: PALE, post: GOLD, panel: NAVY } = venueOf(world).shop
  for (const s of SHOP_STAGES) {
    const w = s.maxX - s.minX
    const d = s.maxZ - s.minZ
    const cx = (s.minX + s.maxX) / 2
    const cz = (s.minZ + s.maxZ) / 2
    blocks.addOn(cx, -0.1, cz, w, s.height + 0.1, d, WHITE)
    blocks.addOn(cx, 0, cz, w + 0.3, s.height * 0.5, d + 0.3, YELLOW)
    // Light strips along all four top edges, and a gold post at each corner.
    for (const side of [-1, 1]) {
      blocks.addOn(cx + side * (w / 2 - 0.25), s.height, cz, 0.35, 0.08, d - 1.4, PALE, STYLE.GLOW)
      blocks.addOn(cx, s.height, cz + side * (d / 2 - 0.25), w - 1.4, 0.08, 0.35, PALE, STYLE.GLOW)
      for (const end of [-1, 1]) {
        blocks.addOn(cx + side * (w / 2 - 0.35), s.height, cz + end * (d / 2 - 0.35), 0.6, 0.7, 0.6, GOLD, STYLE.GLOW)
      }
    }
  }

  // The sign: two striped legs, a navy panel in a yellow frame, a gold cap, its face
  // turned to the plaza (`f`).
  const { x, minZ, maxZ, top } = SHOP_SIGN
  const f = SHOP_SIGN_FACING
  const length = maxZ - minZ
  const midZ = (minZ + maxZ) / 2
  const bottom = top - 8.2
  for (const z of [minZ + 1.5, maxZ - 1.5]) blocks.addOn(x - 0.1 * f, 0, z, 0.9, bottom + 0.3, 0.9, YELLOW, STYLE.STRIPES)
  blocks.addOn(x, bottom, midZ, 0.6, top - bottom, length, YELLOW)
  blocks.addOn(x + 0.1 * f, bottom + 0.5, midZ, 0.6, top - bottom - 1, length - 1, NAVY, STYLE.SMOOTH)
  blocks.addOn(x, top, midZ, 0.9, 0.4, length + 0.4, GOLD, STYLE.GLOW)
  if (detail) {
    for (let z = minZ + 1; z <= maxZ - 0.99; z += 1.5) {
      blocks.add(x + 0.42 * f, bottom + 0.25, z, 0.16, 0.3, 0.3, Math.round(z) % 2 ? '#ffffff' : GOLD, STYLE.GLOW)
      blocks.add(x + 0.42 * f, top - 0.25, z + 0.75, 0.16, 0.3, 0.3, Math.round(z) % 2 ? GOLD : '#ffffff', STYLE.GLOW)
    }
  }
}
