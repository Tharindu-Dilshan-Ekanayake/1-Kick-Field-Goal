import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'

import { RARITIES, TIRES } from '@shared/balance'
import { SHOP_STAGES, STAND_SIZE, TIRE_STANDS } from '@shared/world'

import { useGame } from '../../store/game'
import { getQuality } from '../../store/quality'
import { ballLength, createBallMesh, disposeBallMesh } from '../ball'
import { BlockSet, disposeBlocks } from '../blocks'
import { createGlowInstances, disposeGlow } from '../glow'
import { standLabelSpec, standState } from '../labels/lobbyLabels'
import { updateWorldLabel } from '../labels/registry'
import { sharedMaterials, STYLE } from '../materials'
import { tireGlow, tireRim } from '../tire'

/** Stand colours by state, as in the reference: green equipped, blue owned, red not yet. */
const STAND_COLORS = {
  equipped: new Color('#3fdc4a'),
  owned: new Color('#38c8ff'),
  buy: new Color('#ff3b3b'),
  locked: new Color('#b0262b'),
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _halo = new Vector3()
const _haloQ = new Quaternion()
const _haloS = new Vector3()

/** Height of a stand's glowing cap above its pad; the ball floats over it. */
const CAP_TOP = 1.12
/** Showroom balls' radius (a football is this wide and ballLength times as long). */
const SHOWN_BALL = 1.15
/** How high a ball's centre floats over its stand: clear of the cap, a football's tip included. */
const HOVER = CAP_TOP + SHOWN_BALL * 1.45 + 0.45
/** Footballs stand tilted nose up as they turn, so you see their laces and stripes. */
const FOOTBALL_TILT = 0.45

/**
 * Display stands, all in one block set. The first TIRE_STANDS.length blocks are the
 * stands' tops themselves (recoloured by state, so their instance index is the stand
 * index); the trimmings follow.
 */
function buildStands() {
  const set = new BlockSet()
  const slab = STAND_SIZE - 0.4
  for (const stand of TIRE_STANDS) set.addOn(stand.x, stand.y - 0.1, stand.z, slab, 0.3, slab, '#ffffff', STYLE.STUDS)
  for (const stand of TIRE_STANDS) {
    const id = TIRES[stand.index].id
    const { x, y, z } = stand
    // Grey stepped frame, standing clear of the stand's top, like the reference's.
    const e = slab / 2 + 0.1
    for (const side of [-1, 1]) {
      set.addOn(x, y - 0.1, z + side * e, slab + 0.5, 0.45, 0.3, '#c4ccd8', STYLE.SMOOTH)
      set.addOn(x + side * e, y - 0.1, z, 0.3, 0.45, slab + 0.2, '#c4ccd8', STYLE.SMOOTH)
    }
    // A glowing square ring on the stand in the ball's own glow colour.
    const glow = tireGlow(id)
    for (const side of [-1, 1]) {
      set.addOn(x, y + 0.2, z + side * 1.25, 2.68, 0.06, 0.18, glow, STYLE.GLOW)
      set.addOn(x + side * 1.25, y + 0.2, z, 0.18, 0.06, 2.32, glow, STYLE.GLOW)
    }
    // Low pedestal with a cap in the ball's own colour.
    set.addOn(x, y + 0.2, z, 1.1, 0.7, 1.1, '#f4f7fb', STYLE.SMOOTH)
    set.addOn(x, y + 0.9, z, 1.5, CAP_TOP - 0.9, 1.5, tireRim(id), STYLE.GLOW)
  }
  // A red carpet down the aisle between the two stages, edged in gold.
  const [front, back] = SHOP_STAGES
  // The gap between the two stages, whichever side of the plaza they're on.
  const aisleX = (Math.max(front.minX, back.minX) + Math.min(front.maxX, back.maxX)) / 2
  const length = front.maxZ - front.minZ
  const midZ = (front.minZ + front.maxZ) / 2
  set.addOn(aisleX, 0, midZ, 2.4, 0.06, length, '#d8263a', STYLE.SMOOTH)
  for (const side of [-1, 1]) set.addOn(aisleX + side * 1.25, 0, midZ, 0.18, 0.1, length, '#ffd21f', STYLE.GLOW)
  return set.build(sharedMaterials().blocks)
}

/**
 * The ball shop: twenty-four display stands on the two showroom stages, each with its
 * ball floating above it, turning slowly like a trophy on a turntable (footballs tilted
 * nose up, so their laces show). Stands recolour and their labels rewrite as you buy and
 * equip. Three draw calls: stands, balls, halos.
 */
export function TireShop() {
  const owned = useGame((s) => s.profile.ownedTires)
  const equipped = useGame((s) => s.profile.equippedTire)
  const standsRef = useRef(null)
  const halosRef = useRef(null)
  const ballsRef = useRef(null)

  const assets = useMemo(() => {
    const stands = buildStands()
    const count = TIRES.length
    // Every showroom ball, in one draw call. On LOW they're the lite sphere: seen from
    // across the plaza, the full one's extra segments are below a pixel.
    const balls = createBallMesh(count, getQuality().decorDensity < 0.5 ? 'lite' : 'full')
    TIRES.forEach((tire, i) => balls.setBall(i, tire.id))
    balls.count = count
    // A soft glow behind each ball in its rarity's colour: the rarer, the brighter it reads.
    const halos = createGlowInstances(count, 0.45)
    TIRES.forEach((tire, i) => halos.setColorAt(i, new Color(RARITIES[tire.rarity]?.color ?? '#ffffff')))
    halos.count = count
    // Each ball's length (1 for round ones) never changes: looked up once, not per frame.
    const lengths = TIRES.map((tire) => ballLength(tire.id))
    return { stands, balls, halos, lengths }
  }, [])

  useEffect(
    () => () => {
      disposeBlocks(assets.stands)
      disposeGlow(assets.halos)
      disposeBallMesh(assets.balls)
    },
    [assets],
  )

  // Recolour stands and rewrite their labels whenever ownership changes.
  useEffect(() => {
    const stands = standsRef.current
    const profile = { ownedTires: owned, equippedTire: equipped }
    for (const stand of TIRE_STANDS) {
      const state = standState(profile, stand.index)
      stands?.setColorAt(stand.index, STAND_COLORS[state])
      updateWorldLabel(`stand-${stand.index}`, standLabelSpec(stand.index, state))
    }
    if (stands?.instanceColor) stands.instanceColor.needsUpdate = true
  }, [owned, equipped])

  useFrame((state) => {
    const halos = halosRef.current
    const balls = ballsRef.current
    if (!halos || !balls) return
    const t = state.clock.elapsedTime
    for (const stand of TIRE_STANDS) {
      const long = assets.lengths[stand.index]
      _p.set(stand.x, stand.y + HOVER + Math.sin(t * 1.6 + stand.index) * 0.15, stand.z)
      // Turning round on the spot; a football (long > 1) leans nose up as it goes.
      _q.setFromEuler(_e.set(long > 1 ? FOOTBALL_TILT : 0.12, t * 0.6 + stand.index * 0.7, 0, 'YXZ'))
      balls.setMatrixAt(stand.index, _m.compose(_p, _q, _s.setScalar(SHOWN_BALL)))
      // Set back behind the ball as seen from the camera, so it glows round it, not over it.
      _halo.copy(_p).sub(state.camera.position).normalize().multiplyScalar(1.6).add(_p)
      halos.setMatrixAt(stand.index, _m.compose(_halo, _haloQ, _haloS.setScalar(SHOWN_BALL * 3.8)))
    }
    balls.instanceMatrix.needsUpdate = true
    halos.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive ref={standsRef} object={assets.stands} />
      <primitive ref={ballsRef} object={assets.balls} />
      <primitive ref={halosRef} object={assets.halos} />
    </>
  )
}

export default TireShop
