import { Euler, Quaternion, Vector3 } from 'three'

import { ROLL_LAUNCH } from '@shared/balance'
import { SLOPE_ANGLE, TRACK_START_Z } from '@shared/world'

import { KICK_IMPACT } from '../playerPose'
import { BALL_SIZE, swellSize, TEE_AHEAD, TEE_BALL_SIZE } from '../kick'

/**
 * Geometry of the kick: one long, straight football field running north from the
 * plaza's edge, dead level (SLOPE_ANGLE is 0; the maths still allows a slope).
 *
 * Track metre `m` (a yard, to the player) is measured along the field from the start line
 * (the plaza's north edge). Before the start (m < 0) the ground is the plaza. Everything here is pure
 * maths and allocation-free, so the frame loop can call it freely.
 */

export const SIN = Math.sin(SLOPE_ANGLE)
export const COS = Math.cos(SLOPE_ANGLE)
export const TAN = Math.tan(SLOPE_ANGLE)

/** World z of track metre m. */
export const zAt = (m) => TRACK_START_Z - (m > 0 ? m * COS : m)
/** Height of the floor at track metre m. */
export const floorY = (m) => (m > 0 ? -m * SIN : 0)
/** Height of the track's floor plane under world z. */
export const slopeY = (z) => (z < TRACK_START_Z ? -(TRACK_START_Z - z) * TAN : 0)
/** Height of a surface parallel to the floor, `h` metres off it, under world z. */
export const surfaceY = (z, h) => slopeY(z) + h / COS

/** How a box lies on the track: tipped back by the slope angle. */
export const SLOPE_EULER_X = -SLOPE_ANGLE

/** World point at track metre m, `x` to the side and `h` off the floor. */
export function trackPoint(m, x, h, out) {
  if (m <= 0) return out.set(x, h, TRACK_START_Z - m)
  return out.set(x, -m * SIN + h * COS, TRACK_START_Z - m * COS - h * SIN)
}

const _e = new Euler()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()

/**
 * Matrix of a box lying on the track, given in track terms: centred `x` across, `h`
 * off the floor (to its centre) and at metre `m` (also its centre), sized `sx` across,
 * `sy` thick and `sz` along the track, leaning `lean` radians about its own long axis.
 */
export function slopeBoxMatrix(m, x, h, sx, sy, sz, lean, out) {
  trackPoint(m, x, h, _p)
  _q.setFromEuler(_e.set(m > 0 ? SLOPE_EULER_X : 0, 0, lean))
  return out.compose(_p, _q, _s.set(sx, sy, sz))
}

/** Same as slopeBoxMatrix, but as BlockSet.add arguments: [x, y, z, rotX]. */
export function slopeBoxPlacement(m, x, h) {
  trackPoint(m, x, h, _p)
  return [_p.x, _p.y, _p.z, m > 0 ? SLOPE_EULER_X : 0]
}

/** Metres a world z is along the track (negative in the plaza). */
export const meterAtZ = (z) => (z < TRACK_START_Z ? (TRACK_START_Z - z) / COS : TRACK_START_Z - z)

// --- A kick -------------------------------------------------------------------------

/** Radius of a kicked ball in flight (kick.BALL_SIZE; named for the template's tire). */
export const TIRE_SIZE = BALL_SIZE

const clamp01 = (x) => Math.min(1, Math.max(0, x))

/**
 * The ball rests on its tee this far ahead of you when you kick it, and the flight sets
 * off from there.
 */
export const PUSH_AHEAD = TEE_AHEAD
/**
 * Seconds into a kick that the foot meets the ball: the player runs up and swings
 * (playerPose.kickPose, over ROLL_LAUNCH), and the ball sits on its tee until then. The
 * kick's total time is the authority's, so the flight runs from here.
 */
export const KICK_HIT = ROLL_LAUNCH * KICK_IMPACT

/**
 * The flight takes LAND_T of the kick's time after the foot meets it; the rest is the ball
 * bouncing on the turf and settling in the grass.
 */
const LAND_T = 0.84
/** Bounces on the turf after it thumps down, over the first SETTLE of the time left. */
const BOUNCES = 2
const SETTLE = 0.65
/** How far the ball nestles into the grass once it has settled. */
const SUNK = 0.04

/**
 * How far along its distance (0-1) the ball is `t` of the way through its flight: off
 * the foot fast, slowing as it goes, and still moving as it slams down at the end.
 */
const progress = (t) => {
  const x = clamp01(t)
  return 1.5 * x - 0.5 * x * x
}

/**
 * Seconds into a kick of `duration` (launch included) at which the ball has flown `f`
 * (0-1) of its distance: 0.5 is the top of its arc, 1 the moment it slams down.
 */
export const kickTimeAt = (f, duration) => KICK_HIT + LAND_T * (1.5 - Math.sqrt(2.25 - 2 * clamp01(f))) * Math.max(0.1, duration - KICK_HIT)

/**
 * The flight: one high arc over the whole distance, thumping down exactly where the
 * authority says it stops - a splash of turf (Impact.jsx) - then a couple of bounces on
 * the grass and it settles there. The arc's peak grows with the distance (a short
 * kick is a lob, a long one soars) and with how well it was kicked (KICK_ARC: a WEAK
 * kick skims low, a PERFECT one soars high), capped so the field stays in view below it.
 */
/** Height of the ball's bottom off the ground as it leaves the foot: it starts on the grass. */
const LAUNCH_AIR = 0
/** How high each meter grade's kick flies, against a plain kick's arc (Auto Kick: 1). */
const KICK_ARC = { weak: 0.5, good: 0.85, great: 1.15, perfect: 1.45 }
export const flightPeak = (distance, hit = null) =>
  Math.min(44, (4 + 0.6 * Math.sqrt(Math.max(0, distance))) * (KICK_ARC[hit] ?? 1))

/** A fresh state for rideState to write into. */
export const createRideState = () => ({
  phase: 'launch',
  launch: 0,
  meter: 0,
  speed: 0,
  /** Height of the ball's bottom off the field. */
  air: 0,
  /** The ball's radius now: TEE_BALL_SIZE on the tee, swelling to BALL_SIZE as it flies. */
  size: TEE_BALL_SIZE,
  /** True while the ball is in its arc (until it first lands). */
  airborne: false,
  /** 0 in the air; 1 once it has slammed down, then one more for every hop after. */
  bounces: 0,
  /** Turn about the ball's sideways axis (radians): its spin. */
  spin: 0,
  /** Template leftovers rideTurn still reads: always 0 for a ball. */
  lean: 0,
  topple: 0,
  yaw: 0,
  /** Never true: nothing on the lane stops a ball. */
  crashed: false,
  x: 0,
  position: new Vector3(),
})

/**
 * Everything about a kicked ball `elapsed` seconds into a kick - yours, or another
 * player's replayed from the same numbers, so both move identically. `ride` is
 * `{ fromMeter, startX, distance, duration }` (duration includes the launch); `lane` is
 * a sideways offset so balls don't overlap. Writes into `out` (see createRideState):
 *   phase    'launch' (on its tee, the kicker running up) | 'ride' | 'stopped'
 *   launch   0-1 through the launch
 *   meter    yards along the field; speed in yd/s along it
 *   air      height of its bottom off the field; airborne until it first lands
 *   size     its radius now
 *   position the ball's centre
 */
export function rideState(elapsed, ride, lane, out) {
  const start = ride.fromMeter + PUSH_AHEAD
  const end = Math.max(start + 1, ride.distance)
  const flightTime = Math.max(0.1, ride.duration - KICK_HIT)
  let meter = start
  let speed = 0
  let air
  out.airborne = false
  out.crashed = false
  out.bounces = 0
  if (elapsed < KICK_HIT) {
    out.phase = 'launch'
    out.launch = clamp01(elapsed / KICK_HIT)
    air = LAUNCH_AIR
  } else {
    const t = (elapsed - KICK_HIT) / flightTime
    out.launch = 1
    out.phase = t >= 1 ? 'stopped' : 'ride'
    const peak = flightPeak(end - start, ride.hit)
    if (t < LAND_T) {
      const f = progress(t / LAND_T)
      meter = start + (end - start) * f
      speed = ((end - start) * (1.5 - (t / LAND_T))) / (LAND_T * flightTime)
      air = LAUNCH_AIR * (1 - f) + peak * 4 * f * (1 - f)
      out.airborne = true
    } else {
      // Down on the turf: BOUNCES hops, each lower, then it settles in the grass.
      meter = end
      const u = (t - LAND_T) / (1 - LAND_T) / SETTLE
      if (u < 1) {
        air = peak * 0.09 * (1 - u) * Math.abs(Math.sin(Math.PI * BOUNCES * u))
        out.bounces = 1 + Math.min(BOUNCES - 1, Math.floor(u * BOUNCES))
      } else {
        air = -SUNK * clamp01((u - 1) * 4)
        out.bounces = BOUNCES
      }
    }
  }
  // Ease from where it was hit onto its own line down the lane.
  const settle = clamp01((meter - start) / 40)
  const x = ride.startX * (1 - settle) + lane * settle
  out.meter = meter
  out.speed = speed
  out.air = air
  out.lean = 0
  out.topple = 0
  out.yaw = 0
  // Tumbling end over end as it goes (a football's long axis runs along the kick).
  out.spin = -(meter - start) / TIRE_SIZE
  out.x = x
  out.size = swellSize((meter - start) / 5)
  trackPoint(meter, x, out.size + air, out.position)
  return out
}

const _ax = new Vector3(1, 0, 0)
const _ay = new Vector3(0, 1, 0)
const _az = new Vector3(0, 0, 1)
const _qa = new Quaternion()
const _qb = new Quaternion()
const _qc = new Quaternion()

/** The ball's turn for ride state `st`: its tumble about its sideways axis. */
export function rideTurn(st, out) {
  // Turn about the vertical (Y), lean about the direction of travel (Z), then the spin
  // about X.
  _qc.setFromAxisAngle(_ay, st.yaw || 0)
  return out.multiplyQuaternions(_qc, _qa.setFromAxisAngle(_az, st.lean)).multiply(_qb.setFromAxisAngle(_ax, st.spin))
}
