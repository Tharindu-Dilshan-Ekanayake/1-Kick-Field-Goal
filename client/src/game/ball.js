import { BufferGeometry, Color, InstancedBufferAttribute, InstancedMesh, MeshToonMaterial, SphereGeometry } from 'three'

import { glowTime } from './glow'

/**
 * The balls you kick: every ball in the shop (shared/balance.js TIRES) has a look of its
 * own (BALL_STYLES) - a pebbled football with laces, a soccer ball, a tennis ball, a
 * basketball, a volleyball, a baseball, a beach ball, a bowling ball, a rugby ball, a golf
 * ball, then metal, ice, lava and gem footballs, a rainbow, a unicorn ball, a galaxy, dragon
 * scales, a cosmic ball and a prismatic infinity football - all drawn by one shader
 * (BALL_GLSL) from a pattern id and three colours per instance, so every ball in a mesh,
 * whatever it looks like, is one draw call and one shader program. No textures.
 *
 * Footballs (`football: true`) are prolate: the mesh is a unit sphere and the vertex shader
 * stretches it along local Z (its long axis, ballLength(id) times as long as it is wide), so
 * a football flying -Z goes nose first and a spin about X tumbles it end over end. The
 * instance scale is the ball's equatorial radius, same as for a round ball.
 */

/** The designs BALL_GLSL can draw, by id. */
export const PATTERN = {
  FOOTBALL: 0,
  SOCCER: 1,
  TENNIS: 2,
  BASKETBALL: 3,
  VOLLEYBALL: 4,
  BASEBALL: 5,
  BEACH: 6,
  BOWLING: 7,
  RUGBY: 8,
  GOLF: 9,
  METAL: 10,
  ICE: 11,
  LAVA: 12,
  GEM: 13,
  RAINBOW: 14,
  UNICORN: 15,
  GALAXY: 16,
  SCALES: 17,
  COSMIC: 18,
  PRISM: 19,
}

/** Long semi-axis of a football over its equatorial radius. */
const FOOTBALL_LENGTH = 1.45

/**
 * Each ball's look, by tire id (shared/balance.js TIRES; the ids are old, the names
 * new): its pattern, its colours (`a` the base, `b` and `c` the design - what they are
 * depends on the pattern), how much it glows on its own, and whether it's football-shaped.
 */
export const BALL_STYLES = {
  // Rookie Football: pebbled brown leather, white laces and two white stripes at each end.
  bicycle: { pattern: PATTERN.FOOTBALL, a: '#9a5226', b: '#ffffff', c: '#3e200e', football: true },
  // Soccer Ball: white with black pentagons.
  mountain: { pattern: PATTERN.SOCCER, a: '#ffffff', b: '#15171c', c: '#7d8492' },
  // Tennis Ball: optic yellow felt, a white seam.
  wood: { pattern: PATTERN.TENNIS, a: '#d2f21c', b: '#ffffff', c: '#8aa80a' },
  // Basketball: orange and pebbled, black channels.
  stone: { pattern: PATTERN.BASKETBALL, a: '#ff7a1a', b: '#1b1b1f', c: '#ffffff' },
  // Volleyball: yellow, blue and white panels.
  cookie: { pattern: PATTERN.VOLLEYBALL, a: '#ffd21f', b: '#2f7bff', c: '#ffffff' },
  // Baseball: white leather, red stitches.
  pizza: { pattern: PATTERN.BASEBALL, a: '#fbf7ee', b: '#d8222a', c: '#b8b3a6' },
  // Beach Ball: six wedges, white caps.
  donut: { pattern: PATTERN.BEACH, a: '#ff3b3b', b: '#ffd21f', c: '#2f9bff' },
  // Bowling Ball: a dark marbled swirl with three finger holes.
  watermelon: { pattern: PATTERN.BOWLING, a: '#101528', b: '#5b2cff', c: '#33d6ff' },
  // Rugby Ball: red panels, white seams, dark grip dots.
  monster: { pattern: PATTERN.RUGBY, a: '#d83a2f', b: '#ffffff', c: '#2a1210', football: true },
  // Golf Ball: white and dimpled.
  mint: { pattern: PATTERN.GOLF, a: '#ffffff', b: '#8398b0', c: '#ffffff' },
  // Silver Football: brushed metal, laces and grey stripes.
  silver: { pattern: PATTERN.METAL, a: '#a9b3c4', b: '#ffffff', c: '#5d6a80', glow: 0.08, football: true },
  // Ice Ball: cracked pale-blue ice, frost and a cold glow.
  ice: { pattern: PATTERN.ICE, a: '#c9f1ff', b: '#5fb6ee', c: '#ffffff', glow: 0.12 },
  // Golden Football: shiny gold, laces, stripes in a deeper gold, glowing.
  gold: { pattern: PATTERN.METAL, a: '#ffc81a', b: '#fff4c0', c: '#d68500', glow: 0.2, football: true },
  // Lava Ball: a dark crust split by glowing cracks.
  lava: { pattern: PATTERN.LAVA, a: '#3a1410', b: '#ff6a1e', c: '#ffd21f' },
  // Platinum Football: pale metal with blue stripes.
  platinum: { pattern: PATTERN.METAL, a: '#d3dce9', b: '#ffffff', c: '#2f6bff', glow: 0.1, football: true },
  // Emerald, Ruby and Diamond Footballs: cut gem facets, glinting.
  emerald: { pattern: PATTERN.GEM, a: '#3be08a', b: '#0a7d3a', c: '#d6ffe6', glow: 0.2, football: true },
  ruby: { pattern: PATTERN.GEM, a: '#ff4a6a', b: '#8a0a26', c: '#ffd6de', glow: 0.2, football: true },
  diamond: { pattern: PATTERN.GEM, a: '#bff0ff', b: '#3fb8ff', c: '#ffffff', glow: 0.1, football: true },
  // Rainbow Football: flowing rainbow, white laces.
  rainbow: { pattern: PATTERN.RAINBOW, a: '#ffffff', b: '#ffffff', c: '#ffffff', glow: 0.15, football: true },
  // Unicorn Ball: pastel swirl, sparkles.
  unicorn: { pattern: PATTERN.UNICORN, a: '#ff9fe0', b: '#9cc8ff', c: '#c9a8ff', glow: 0.06 },
  // Galaxy Football: swirling nebula, twinkling stars.
  galaxy: { pattern: PATTERN.GALAXY, a: '#140c2a', b: '#a46bff', c: '#5fd6ff', football: true },
  // Dragon Football: scales rimmed in gold.
  dragon: { pattern: PATTERN.SCALES, a: '#1f9a4a', b: '#ffd21f', c: '#ffffff', football: true },
  // Cosmic Football: a navy, magenta and gold nebula with stars.
  cosmic: { pattern: PATTERN.COSMIC, a: '#0b1738', b: '#ff3d8a', c: '#ffd24a', football: true },
  // Infinity Football: prismatic facets, colours that never stop moving.
  infinity: { pattern: PATTERN.PRISM, a: '#ffffff', b: '#ffffff', c: '#ffffff', glow: 0.1, football: true },
}

// Parsed once: setBall runs in frame loops and must not allocate.
const PARSED = Object.fromEntries(
  Object.entries(BALL_STYLES).map(([id, s]) => [
    id,
    { ...s, a: new Color(s.a), b: new Color(s.b), c: new Color(s.c), glow: s.glow ?? 0, length: s.football ? FOOTBALL_LENGTH : 1 },
  ]),
)
const styleOf = (id) => PARSED[id] || PARSED.bicycle

/**
 * How much longer than wide ball `id` is (its half-length over its radius): 1 for round
 * balls, more for footballs. A ball lying on the ground rests at the same height either way.
 */
export const ballLength = (id) => styleOf(id).length

/** The 20 directions a truncated icosahedron's hexagons face (the soccer ball's panels). */
const SOCCER_FACES = (() => {
  const phi = (1 + Math.sqrt(5)) / 2
  const k = 1 / phi
  const raw = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) raw.push([x, y, z])
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      raw.push([0, a * phi, b * k], [a * k, 0, b * phi], [a * phi, b * k, 0])
    }
  }
  const f = (n) => n.toFixed(6)
  return raw
    .map(([x, y, z]) => {
      const l = Math.hypot(x, y, z)
      return `vec3(${f(x / l)}, ${f(y / l)}, ${f(z / l)})`
    })
    .join(', ')
})()

const vertexHead = /* glsl */ `
  attribute vec3 aBallB;
  attribute vec3 aBallC;
  attribute vec4 aBallStyle;
  varying vec3 vBallP;
  varying vec3 vBallB;
  varying vec3 vBallC;
  varying vec3 vBallS;
`
/** Stretches a football along Z, and tilts its normals to match (an ellipsoid's normal). */
const vertexNormal = /* glsl */ `
  objectNormal = normalize(vec3(objectNormal.xy * aBallStyle.w, objectNormal.z));
`
const vertexBody = /* glsl */ `
  vBallP = position;
  vBallB = aBallB;
  vBallC = aBallC;
  vBallS = aBallStyle.xyz;
  transformed.z *= aBallStyle.w;
`

const fragmentHead = /* glsl */ `
  uniform float uBTime;
  varying vec3 vBallP;
  varying vec3 vBallB;
  varying vec3 vBallC;
  varying vec3 vBallS;
  const float BTAU = 6.2831853;
  const float BPHI = 1.6180339887;
  const vec3 SOCCER_F[20] = vec3[20](${SOCCER_FACES});
  float bHash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  vec3 bHue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }
  /** Cells round jittered points: x = distance to the nearest, y = to the edge between it and the next, z = its id. */
  vec3 bCell(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int x = -1; x <= 1; x++)
      for (int y = -1; y <= 1; y++)
        for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = vec3(bHash(i + g), bHash(i + g + 11.3), bHash(i + g + 27.1));
          float d = length(g + o - f);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = bHash(i + g + 5.7);
          } else if (d < d2) {
            d2 = d;
          }
        }
    return vec3(d1, d2 - d1, id);
  }
`

/**
 * The ball's design, on the unit sphere it's made from: `u` round it (0-1), `v` up it
 * (-1..1) - and, for the football-shaped, `p.z` along it (its long axis). Then the PERFECT
 * kick's fire round its edge (vBallS.z), and its own glow.
 */
const BALL_GLSL = /* glsl */ `
  {
    vec3 p = normalize(vBallP);
    float u = atan(p.z, p.x) / BTAU + 0.5;
    float v = p.y;
    vec3 A = diffuseColor.rgb;
    vec3 B = vBallB;
    vec3 C = vBallC;
    vec3 col = A;
    float glow = vBallS.y;
    int k = int(vBallS.x + 0.5);
    // The cell pattern (bCell, 27 lookups) is worked out once, at the scale this ball's
    // design wants, and only for the designs that use it: a compiler copies a function
    // into every place it's called, and several calls made this shader several times the size.
    vec3 cell = vec3(1.0, 1.0, 0.0);
    if (k == 9 || k == 11 || k == 12 || k == 13 || k == 19) {
      float cs = k == 9 ? 4.4 : (k == 11 ? 2.4 : (k == 12 ? 2.6 : (k == 13 ? 3.5 : 3.0)));
      cell = bCell(p * cs);
    }
    // A football's stripes and laces (the football, metal, and rainbow balls): along its
    // long axis (z) with the laces up (+y).
    float aa = abs(p.z);
    float stripe = max(
      smoothstep(0.58, 0.6, aa) * (1.0 - smoothstep(0.66, 0.68, aa)),
      smoothstep(0.74, 0.76, aa) * (1.0 - smoothstep(0.82, 0.84, aa)));
    float onTop = smoothstep(0.35, 0.55, p.y);
    float laceLen = 1.0 - smoothstep(0.3, 0.34, aa);
    float spine = 1.0 - smoothstep(0.035, 0.055, abs(p.x));
    float bars = (1.0 - smoothstep(0.17, 0.2, abs(p.x))) * step(fract(p.z * 12.0 + 0.5), 0.38);
    float lace = max(spine, bars) * laceLen * onTop;
    float laceBed = (1.0 - smoothstep(0.22, 0.27, abs(p.x))) * (1.0 - smoothstep(0.34, 0.38, aa)) * onTop;
    if (k == 0 || k == 10) {
      vec3 leather;
      if (k == 10) {
        // Brushed metal: fine streaks round the long axis and a broad sheen.
        float brush = 0.5 + 0.5 * sin(atan(p.y, p.x) * 38.0 + p.z * 3.0);
        leather = A * (0.82 + 0.2 * brush + 0.16 * smoothstep(-0.2, 0.8, p.y));
      } else {
        // Pebbled leather.
        float peb = bHash(floor(p * 52.0));
        leather = A * (0.88 + 0.2 * peb) * (0.9 + 0.15 * smoothstep(-0.3, 0.9, p.y));
      }
      col = mix(leather, k == 10 ? C : B, stripe);
      col = mix(col, k == 10 ? A * 0.45 : C, laceBed * 0.75);
      col = mix(col, B, lace);
    } else if (k == 1) {
      // A soccer ball: black pentagons (round the 12 icosahedron corners) between white
      // hexagons (the 20 faces), thin seams round both. d1 = how near the nearest pentagon's
      // centre, f1 and f2 the nearest two hexagon centres.
      vec3 q = abs(p);
      float d1 = max(max(q.y + BPHI * q.z, q.x + BPHI * q.y), BPHI * q.x + q.z) / 1.9021130326;
      float f1 = -1.0;
      float f2 = -1.0;
      for (int i = 0; i < 20; i++) {
        float d = dot(p, SOCCER_F[i]);
        if (d > f1) {
          f2 = f1;
          f1 = d;
        } else if (d > f2) {
          f2 = d;
        }
      }
      float pd = d1 - f1 - 0.027;
      float pent = smoothstep(-0.006, 0.006, pd);
      float seam = max(1.0 - smoothstep(0.006, 0.016, abs(pd)), (1.0 - smoothstep(0.006, 0.016, f1 - f2)) * (1.0 - pent));
      col = mix(A, B, pent);
      col = mix(col, C, seam);
    } else if (k == 2) {
      // A tennis ball: fuzzy felt and the curved white seam.
      col = A * (0.9 + 0.16 * bHash(floor(p * 70.0)));
      float d = abs(v - 0.55 * sin(u * BTAU * 2.0));
      col = mix(col, A * 0.74, (1.0 - smoothstep(0.085, 0.125, d)) * 0.55);
      col = mix(col, B, 1.0 - smoothstep(0.05, 0.085, d));
    } else if (k == 3) {
      // A basketball: pebbles, the equator, the meridian and two curved channels either side.
      col = A * (0.86 + 0.2 * bHash(floor(p * 34.0)));
      float l = 1.0 - smoothstep(0.034, 0.048, abs(p.y));
      l = max(l, 1.0 - smoothstep(0.034, 0.048, abs(p.x)));
      l = max(l, 1.0 - smoothstep(0.034, 0.048, abs(abs(p.z) - 0.78 * (1.0 - p.y * p.y))));
      col = mix(col, B, l);
    } else if (k == 4) {
      // A volleyball: panels in three colours in swirling strips, seams between.
      float t = u * 6.0 + v * 1.6;
      float idx = mod(floor(t), 3.0);
      col = idx < 0.5 ? A : (idx < 1.5 ? B : C);
      col = mix(col, vec3(0.2, 0.22, 0.3), smoothstep(0.46, 0.495, abs(fract(t) - 0.5)));
      col = mix(col, col * 0.78, smoothstep(0.47, 0.5, abs(fract(t * 3.0) - 0.5)) * 0.6);
    } else if (k == 5) {
      // A baseball: white leather, the seam, and red stitches crossing it.
      float ad = abs(v - 0.55 * sin(u * BTAU * 2.0));
      col = A * (0.96 + 0.06 * bHash(floor(p * 40.0)));
      float dash = step(fract(u * 52.0), 0.32);
      float stitch = smoothstep(0.045, 0.06, ad) * (1.0 - smoothstep(0.14, 0.155, ad)) * dash;
      col = mix(col, B, stitch);
      col = mix(col, C, 1.0 - smoothstep(0.012, 0.025, ad));
    } else if (k == 6) {
      // A beach ball: six wedges (red, yellow and blue between white), white caps.
      float m = mod(floor(u * 6.0), 6.0);
      col = m < 0.5 ? A : (m < 1.5 ? vec3(1.0) : (m < 2.5 ? B : (m < 3.5 ? vec3(1.0) : (m < 4.5 ? C : vec3(1.0)))));
      col = mix(col, col * 0.82, smoothstep(0.47, 0.495, abs(fract(u * 6.0) - 0.5)));
      col = mix(col, vec3(1.0), smoothstep(0.8, 0.84, abs(v)));
      col = mix(col, vec3(1.0, 0.84, 0.2), smoothstep(0.985, 0.992, abs(v)));
    } else if (k == 7) {
      // A bowling ball: dark swirling marble, and three finger holes.
      float sw = sin(p.x * 4.0 + 2.2 * sin(p.y * 3.0 + p.z * 2.0) + 1.5 * sin(p.z * 5.0));
      float sw2 = sin(p.y * 6.0 + 2.0 * sin(p.x * 4.0 + p.z * 2.0));
      col = mix(A, B, smoothstep(-0.2, 0.8, sw) * 0.8);
      col = mix(col, C, smoothstep(0.78, 0.95, sw2) * 0.55);
      float holes = max(
        smoothstep(0.9915, 0.9935, dot(p, normalize(vec3(-0.17, 0.28, 0.95)))),
        max(
          smoothstep(0.9915, 0.9935, dot(p, normalize(vec3(0.17, 0.28, 0.95)))),
          smoothstep(0.989, 0.992, dot(p, normalize(vec3(0.0, -0.16, 0.99))))));
      col = mix(col, vec3(0.015), holes);
    } else if (k == 8) {
      // A rugby ball: four panels, white seams, grip dots round the middle, a white ring at each end.
      float ang = atan(p.y, p.x) / BTAU + 0.5;
      col = A;
      float band = 1.0 - smoothstep(0.55, 0.62, aa);
      float dots = (1.0 - smoothstep(0.2, 0.26, length(fract(vec2(p.z * 14.0, ang * 24.0)) - 0.5))) * band;
      col = mix(col, C, dots * 0.6);
      col = mix(col, B, smoothstep(0.465, 0.49, abs(fract(ang * 4.0) - 0.5)));
      col = mix(col, B, smoothstep(0.74, 0.76, aa) * (1.0 - smoothstep(0.8, 0.82, aa)));
    } else if (k == 9) {
      // A golf ball: dimples.
      float dm = 1.0 - smoothstep(0.25, 0.33, cell.x);
      col = mix(A, B, dm * 0.85);
    } else if (k == 11) {
      // Ice: big pale facets, white cracks, frost specks, a cold shimmer.
      col = mix(A, B, cell.z * 0.7);
      float crack = 1.0 - smoothstep(0.0, 0.045, cell.y);
      col = mix(col, vec3(1.0), crack * 0.75);
      col = mix(col, vec3(1.0), step(0.93, bHash(floor(p * 60.0))) * 0.7);
      glow += 0.1 + crack * 0.4;
    } else if (k == 12) {
      // Lava: a dark crust split by glowing, pulsing cracks.
      float crack = 1.0 - smoothstep(0.0, 0.09, cell.y);
      float pulse = 0.7 + 0.3 * sin(uBTime * 3.0 + cell.z * 6.0);
      col = mix(A, mix(B, C, 1.0 - smoothstep(0.0, 0.03, cell.y)), crack);
      glow += crack * 1.3 * pulse;
    } else if (k == 13) {
      // A cut gem: facets, each its own shade, bright edges, one glinting after another.
      col = mix(A, B, cell.z) * (0.75 + 0.45 * fract(cell.z * 7.0));
      col = mix(col, C, (1.0 - smoothstep(0.0, 0.035, cell.y)) * 0.5);
      float glint = step(0.93, fract(cell.z * 13.0 + floor(uBTime * 2.0) * 0.37));
      col = mix(col, vec3(1.0), glint * 0.45);
      glow += 0.05 + glint * 0.45;
    } else if (k == 14) {
      // Rainbow bands, flowing round it, and white laces.
      col = mix(bHue(u + v * 0.4 + uBTime * 0.15), vec3(1.0), 0.15);
      col = mix(col, col * 0.5, laceBed * 0.6);
      col = mix(col, vec3(1.0), lace);
    } else if (k == 15) {
      // Pastel swirl and sparkles.
      float t = u * 3.0 + v * 1.2 + sin(v * 4.0) * 0.3;
      col = mix(A, B, 0.5 + 0.5 * sin(t * BTAU));
      col = mix(col, C, 0.3 + 0.3 * sin(t * BTAU * 2.0 + 1.0));
      vec3 sc = floor(p * 30.0);
      float star = step(0.985, bHash(sc)) * (0.5 + 0.5 * sin(uBTime * 4.0 + bHash(sc + 2.0) * 20.0));
      col = mix(col, vec3(1.0), star);
      glow += 0.08 + star * 1.2;
    } else if (k == 16) {
      // A galaxy: swirling nebula and twinkling stars.
      float neb = 0.5 + 0.5 * sin(u * BTAU * 2.0 + v * 5.0 + sin(v * 7.0 + u * BTAU));
      col = mix(A, mix(B, C, 0.5 + 0.5 * sin(u * BTAU * 3.0)), neb * 0.7);
      vec3 sc = floor(p * 36.0);
      float star = step(0.975, bHash(sc)) * (0.5 + 0.5 * sin(uBTime * 5.0 + bHash(sc + 3.1) * 30.0));
      col = mix(col, vec3(1.0), star);
      glow += 0.4 + star * 1.5;
    } else if (k == 17) {
      // Scales, row on row, rimmed in gold.
      float row = floor(v * 6.0);
      vec2 q = vec2(fract(u * 14.0 + mod(row, 2.0) * 0.5) - 0.5, fract(v * 6.0) - 0.5);
      float d = length(q * vec2(1.0, 1.3));
      col = mix(A * (1.25 - d * 0.7), B, smoothstep(0.52, 0.6, d));
    } else if (k == 18) {
      // A cosmic nebula: slow ribbons of two colours over deep blue, and stars.
      float n1 = sin(p.x * 4.0 + sin(p.y * 5.0 + uBTime * 0.4) * 1.6);
      float n2 = sin(p.z * 5.0 + p.y * 3.0 + sin(p.x * 6.0) * 1.2 - uBTime * 0.3);
      col = mix(A, B, smoothstep(-0.5, 0.8, n1));
      col = mix(col, C, smoothstep(0.2, 0.95, n2) * 0.8);
      vec3 sc = floor(p * 44.0);
      float star = step(0.97, bHash(sc)) * (0.5 + 0.5 * sin(uBTime * 4.0 + bHash(sc + 1.7) * 25.0));
      col = mix(col, vec3(1.0), star);
      glow += 0.25 + star * 1.2;
    } else {
      // Prism: facets whose colours drift through the rainbow, edges flashing white.
      float h = fract(cell.z + uBTime * 0.15 + p.y * 0.25);
      col = mix(bHue(h), vec3(1.0), 0.25 + 0.2 * fract(cell.z * 7.0));
      float edge = 1.0 - smoothstep(0.0, 0.05, cell.y);
      col = mix(col, vec3(1.0), edge);
      glow += 0.15 + edge * 0.5;
    }
    // A PERFECT kick: the ball burns, fire wrapping its edge.
    float edge = 1.0 - abs(normalize(vNormal).z);
    float fire = vBallS.z * (0.35 + edge * edge);
    col = mix(col, vec3(1.0, 0.5, 0.08), min(1.0, fire));
    glow += vBallS.z * (0.5 + edge);
    diffuseColor.rgb = col;
    totalEmissiveRadiance += col * (0.18 + glow);
  }
`

let material = null
/** The one material every ball uses. */
function ballMaterial() {
  if (!material) {
    // No emissive of its own: each ball brightens itself in its own colour (BALL_GLSL).
    material = new MeshToonMaterial({ color: '#ffffff', emissive: new Color('#000000') })
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertexHead}`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${vertexNormal}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBody}`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${fragmentHead}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${BALL_GLSL}`)
      shader.uniforms.uBTime = glowTime
    }
    material.customProgramCacheKey = () => 'kick-ball-v1'
  }
  return material
}

/**
 * The sphere: full (20 x 12 segments, 440 triangles), and a lighter one for balls seen
 * small (the showroom's on LOW; 12 x 8, 168 triangles).
 */
const SPHERES = {}
function sphere(detail) {
  if (!SPHERES[detail]) {
    SPHERES[detail] = detail === 'lite' ? new SphereGeometry(1, 12, 8) : new SphereGeometry(1, 20, 12)
    SPHERES[detail].deleteAttribute('uv')
  }
  return SPHERES[detail]
}

/**
 * Up to `max` balls in one draw call. Place them with setMatrixAt (scale = the ball's
 * equatorial radius; a football's long axis is local Z), dress each one with
 * `setBall(index, ballId, hot)` - `hot` for a PERFECT kick's fire - and set `.count`.
 * The sphere and material are shared: dispose the mesh and its own geometry only.
 */
export function createBallMesh(max, detail = 'full') {
  const base = sphere(detail)
  // Its own geometry object for its own per-instance attributes, sharing the sphere's buffers.
  const geometry = new BufferGeometry()
  geometry.setIndex(base.index)
  for (const name of ['position', 'normal']) geometry.setAttribute(name, base.getAttribute(name))
  geometry.boundingSphere = base.boundingSphere
  const b = new InstancedBufferAttribute(new Float32Array(max * 3), 3)
  const c = new InstancedBufferAttribute(new Float32Array(max * 3), 3)
  const style = new InstancedBufferAttribute(new Float32Array(max * 4), 4)
  geometry.setAttribute('aBallB', b)
  geometry.setAttribute('aBallC', c)
  geometry.setAttribute('aBallStyle', style)

  const mesh = new InstancedMesh(geometry, ballMaterial(), max)
  const dressed = new Array(max).fill(null)
  const hotness = new Array(max).fill(false)

  /** Dresses ball `i` as ball `id`; cheap to call every frame. */
  mesh.setBall = (i, id, hot = false) => {
    if (dressed[i] === id && hotness[i] === hot) return
    dressed[i] = id
    hotness[i] = hot
    const s = styleOf(id)
    mesh.setColorAt(i, s.a)
    b.setXYZ(i, s.b.r, s.b.g, s.b.b)
    c.setXYZ(i, s.c.r, s.c.g, s.c.b)
    style.setXYZW(i, s.pattern, s.glow, hot ? 1 : 0, s.length)
    mesh.instanceColor.needsUpdate = true
    b.needsUpdate = true
    c.needsUpdate = true
    style.needsUpdate = true
  }
  // Colours exist from the start, so the shader is compiled with them once.
  for (let i = 0; i < max; i += 1) mesh.setBall(i, 'bicycle')
  mesh.count = 0
  mesh.frustumCulled = false
  return mesh
}

/** Frees a mesh made by createBallMesh (the shared sphere and material stay). */
export function disposeBallMesh(mesh) {
  mesh.geometry.dispose()
  mesh.dispose()
}
