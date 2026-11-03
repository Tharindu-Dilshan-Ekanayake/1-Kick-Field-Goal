import { KICK_IMPACT } from './playerPose'

/**
 * Football bits shared by your character, everyone else's and the kick: how big the ball
 * is on the tee and in the air, where the tee is, how far the kicker steps up to it, and
 * the cadence of running on a treadmill. (The ball itself, dressed as each of the balls
 * in the shop, is ball.js.)
 */

// --- The ball -------------------------------------------------------------------------

/** A kicked ball's radius in the air: cartoon-big, so it reads at speed. */
export const BALL_SIZE = 0.9
/**
 * The ball's radius as it rests on the tee (its equatorial radius; a football is longer
 * than that, ball.js's `ballLength`): bigger than life, so you see it from the camera.
 */
export const TEE_BALL_SIZE = 0.32
/** How far ahead of the kicker, in yards, the ball rests on its tee (down the field). */
export const TEE_AHEAD = 1.35

/**
 * The ball's radius `t` (0-1) of the way from the tee to full size: it swells as it leaves
 * the foot, a power kick growing into the shot.
 */
export const swellSize = (t) => TEE_BALL_SIZE + (BALL_SIZE - TEE_BALL_SIZE) * Math.min(1, Math.max(0, t))

// --- Treadmill running ---------------------------------------------------------------

/** Stride phase speed (radians a second) of a sprint on a treadmill: about two strides a second. */
export const RUN_CADENCE = 13

// --- The run-up ------------------------------------------------------------------------

/** How far the kicker steps towards the ball before the foot meets it, in yards. */
export const RUN_UP = 0.6
/** And how far they carry on through it afterwards. */
const FOLLOW_THROUGH = 0.2

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * How far the kicker has moved towards the ball (yards, along the kick) `t` (0-1) through
 * the swing (playerPose, over ROLL_LAUNCH): a couple of steps in, planting for the strike
 * at KICK_IMPACT, then carried on a little by the follow-through.
 */
export const runUpAt = (t) => RUN_UP * smooth(0.02, KICK_IMPACT - 0.02, t) + FOLLOW_THROUGH * smooth(KICK_IMPACT, 1, t)
