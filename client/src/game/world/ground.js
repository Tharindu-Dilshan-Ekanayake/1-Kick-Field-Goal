import {
  BufferAttribute,
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'

import { PLAZA, PORTALS, SHOP, TRACK_START_Z } from '@shared/world'

import { PALETTE, venueOf } from '../sceneStyle'
import { BORDER, PITCH, TRACK } from './pitch'

/**
 * The plaza floor: one big plane whose colours come from a tiny "ground map" texture
 * painted at one texel per world unit. The football field (pitch.js) - its mown bands, the
 * end zones, the white border, the running track and the navy sideline apron - the ball
 * shop's yard and the turf round the plaza are rectangles painted into it on whole units,
 * so every edge is crisp and falls on the stud-tile seams, and the whole floor is a single
 * draw call however many regions it has. (The field's lines and lettering are geometry and
 * decals over it: pitch.js, signs.js.)
 */

const MAP = { minX: -64, maxX: 64, minZ: -44, maxZ: 48 }
const MAP_W = MAP.maxX - MAP.minX
const MAP_H = MAP.maxZ - MAP.minZ

/** Where the ground plane ends to the north: the kick field's own floor takes over there. */
export const GROUND_NORTH_EDGE = TRACK_START_Z

function painter(ctx) {
  const rect = (r, color) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(r.minX - MAP.minX), Math.round(r.minZ - MAP.minZ), Math.round(r.maxX - r.minX), Math.round(r.maxZ - r.minZ))
  }
  const disc = (x, z, radius, color) => {
    ctx.fillStyle = color
    for (let dz = -radius; dz < radius; dz += 1) {
      for (let dx = -radius; dx < radius; dx += 1) {
        if ((dx + 0.5) ** 2 + (dz + 0.5) ** 2 <= radius * radius) {
          ctx.fillRect(Math.floor(x + dx - MAP.minX), Math.floor(z + dz - MAP.minZ), 1, 1)
        }
      }
    }
  }
  return { rect, disc }
}

/** The ground map for `world`'s venue (car park and turf, or sand). */
export function createGroundMap(maxTexture, world = 0) {
  const v = venueOf(world)
  const colors = v.pitch
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')
  const { rect, disc } = painter(ctx)

  // Car park (or sand) all round - the clamped map edge carries it on beyond the stands -
  // then a strip round the plaza in bands two yards wide running out from it: mown turf,
  // or raked sand at the beach.
  rect(MAP, v.surround)
  for (let e = 10; e > 0; e -= 2) {
    rect({ minX: PLAZA.minX - e, maxX: PLAZA.maxX + e, minZ: PLAZA.minZ, maxZ: PLAZA.maxZ + e }, v.strip[(e / 2) % 2])
  }

  // The plaza: the navy sideline apron, the ball shop's yard on it, the portal's rings.
  rect(PLAZA, colors.apron)
  rect(SHOP, v.shopFloor)
  for (const p of PORTALS) {
    disc(p.x, p.z, 6, v.beach ? v.accent : PALETTE.apronEdge)
    disc(p.x, p.z, 5, v.beach ? v.primary : PALETTE.apron)
  }

  // The field down the middle: a running track and a white border each side, mown bands
  // between the goal lines, and the end zones - blue round the kick zone, red to the south.
  const along = { minZ: PLAZA.minZ, maxZ: PLAZA.maxZ }
  for (const side of [-1, 1]) {
    const span = (a, b) => ({ minX: Math.min(side * a, side * b), maxX: Math.max(side * a, side * b), ...along })
    rect(span(TRACK.from, TRACK.to), colors.track)
    rect(span(BORDER.from, BORDER.to), colors.border)
  }
  const { half, north, south, yard } = PITCH
  for (let z = north, k = 0; z < south - 0.01; z += yard, k += 1) {
    rect({ minX: -half, maxX: half, minZ: z, maxZ: z + yard }, PALETTE.turf[k % 2])
  }
  rect({ minX: -half, maxX: half, minZ: PLAZA.minZ, maxZ: north }, colors.north)
  rect({ minX: -half, maxX: half, minZ: south, maxZ: PLAZA.maxZ }, colors.south)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = maxTexture > 512 ? 4 : 1
  return texture
}

/** How far the ground runs out at Palm Beach before the ocean (Ocean.jsx) takes over. */
export const BEACH_EDGE = 118

/**
 * The ground plane, with UVs computed from world position so the map lands exactly
 * on the world grid. Outside the map, clamp-to-edge repeats the car park's (or the sand's)
 * colour. At Palm Beach it stops at BEACH_EDGE, and the sea runs on from there.
 */
export function createGroundGeometry(world = 0) {
  const reach = venueOf(world).beach ? BEACH_EDGE : 280
  const minX = -reach
  const maxX = reach
  const minZ = GROUND_NORTH_EDGE
  const maxZ = reach
  const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)

  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    uv.setXY(i, (x - MAP.minX) / MAP_W, 1 - (z - MAP.minZ) / MAP_H)
  }
  uv.needsUpdate = true
  geometry.setAttribute('aStyle', new BufferAttribute(new Float32Array(position.count), 1))
  return geometry
}
