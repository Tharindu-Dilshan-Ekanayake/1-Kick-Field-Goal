/**
 * The player's body language, shared by the Bloxity avatar and the blocky stand-in so
 * both move the same way.
 *
 * `computePose` turns the motion state into joint angles; each avatar applies them to
 * its own limbs. Angles are radians in character space (the character faces +Z, its
 * left side is +X), about each joint's pivot:
 *   swing - about X: negative swings a limb forward (arm up in front, knee up)
 *   sway  - about Z: positive moves a limb towards +X
 *   twist - about Y: positive turns the right shoulder forward
 * `lift` raises (or, to keep bent legs on the ground, lowers) the body, in metres.
 */

export const POSED_BONES = [
  'Spine1',
  'Neck1',
  'ArmL1',
  'ArmL2',
  'ArmR1',
  'ArmR2',
  'LegL1',
  'LegL2',
  'LegR1',
  'LegR2',
]

/** Written by `computePose` every frame; one shared result, never reallocated. */
export const pose = {
  lift: 0,
  bones: Object.fromEntries(POSED_BONES.map((name) => [name, { swing: 0, sway: 0, twist: 0 }])),
}

/** Sway sign that moves a limb away from the body, per side. */
const OUT_L = 1
const OUT_R = -1

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Adds to a joint, scaled by weight `w`. */
function add(name, swing, sway, twist, w) {
  const b = pose.bones[name]
  b.swing += swing * w
  b.sway += sway * w
  b.twist += twist * w
}

/** Relaxed stance: arms hanging a little out from the sides, knees soft, breathing. */
function stance(w, time) {
  const breath = Math.sin(time * 1.8)
  add('LegL1', -0.04, 0.06 * OUT_L, 0, w)
  add('LegL2', 0.08, 0, 0, w)
  add('LegR1', 0.04, 0.06 * OUT_R, 0, w)
  add('LegR2', 0.08, 0, 0, w)
  add('Spine1', -0.03 + breath * 0.015, 0, 0, w)
  add('ArmL1', -0.08 + breath * 0.03, 0.14 * OUT_L, 0, w)
  add('ArmL2', -0.25, 0, 0, w)
  add('ArmR1', -0.08 + breath * 0.03, 0.14 * OUT_R, 0, w)
  add('ArmR2', -0.25, 0, 0, w)
  pose.lift += (-0.01 + breath * 0.006) * w
}

/**
 * Walk to sprint: arms and legs swing against each other, the body leans in and bobs
 * once per step. `phase` advances faster with speed, so the steps quicken.
 */
function stride(phase, ratio) {
  const cycle = Math.sin(phase)
  const leg = 0.85 * ratio
  const arm = 0.75 * ratio
  add('LegL1', cycle * leg, 0, 0, 1)
  add('LegR1', -cycle * leg, 0, 0, 1)
  // Knees fold on the back swing only.
  add('LegL2', Math.max(0, -cycle) * 1.1 * ratio, 0, 0, 1)
  add('LegR2', Math.max(0, cycle) * 1.1 * ratio, 0, 0, 1)
  add('ArmL1', -cycle * arm, 0.08 * OUT_L * ratio, 0, 1)
  add('ArmR1', cycle * arm, 0.08 * OUT_R * ratio, 0, 1)
  add('ArmL2', -(0.35 + Math.max(0, -cycle) * 0.5) * ratio, 0, 0, 1)
  add('ArmR2', -(0.35 + Math.max(0, cycle) * 0.5) * ratio, 0, 0, 1)
  add('Spine1', -(0.08 + 0.14 * ratio) * ratio, 0, cycle * 0.12 * ratio, 1)
  pose.lift += (Math.abs(Math.cos(phase)) * 0.05 - 0.015) * ratio
}

/**
 * In the air: one knee up and the arms out on the way up; falling, the legs straighten
 * and reach down for the ground.
 */
function airborne(vy) {
  const f = smooth(0, 1, clamp01((2 - vy) / 9))
  add('LegL1', lerp(-1.3, -0.35, f), 0.08 * OUT_L, 0, 1)
  add('LegL2', lerp(1.6, 0.25, f), 0, 0, 1)
  add('LegR1', lerp(0.25, -0.1, f), 0.08 * OUT_R, 0, 1)
  add('LegR2', lerp(0.5, 0.2, f), 0, 0, 1)
  add('ArmL1', lerp(-0.35, -0.6, f), lerp(1.15, 1.45, f) * OUT_L, 0, 1)
  add('ArmL2', -0.35, 0, 0, 1)
  add('ArmR1', lerp(-0.25, -0.5, f), lerp(1.05, 1.35, f) * OUT_R, 0, 1)
  add('ArmR2', -0.4, 0, 0, 1)
  add('Spine1', lerp(-0.15, 0.06, f), 0, 0, 1)
}

/**
 * Lying face down on the board, head first (the body itself is turned prone by its
 * holder; this is the pose within that): hands down gripping the rails, legs straight
 * out behind, chest and head lifted to see where you're going. Rattles a little at speed.
 */
function prone(time, speed, w = 1) {
  const rattle = Math.min(1, speed / 80) * 0.05
  const shake = Math.sin(time * 37) * rattle
  add('Spine1', -0.16, 0, 0, w)
  add('Neck1', -0.95, 0, 0, w)
  add('ArmL1', -1.35 + shake, 0.42 * OUT_L, 0, w)
  add('ArmL2', -0.7, 0, 0, w)
  add('ArmR1', -1.35 - shake, 0.42 * OUT_R, 0, w)
  add('ArmR2', -0.7, 0, 0, w)
  add('LegL1', 0.08 + shake, 0.1 * OUT_L, 0, w)
  add('LegL2', 0.12, 0, 0, w)
  add('LegR1', 0.08 - shake, 0.1 * OUT_R, 0, w)
  add('LegR2', 0.12, 0, 0, w)
}

/**
 * The launch, `t` 0..1 (the holder moves and turns the body; this is the pose within):
 * crouch down with the arms swung back, spring into a dive with both arms stretched
 * out ahead, and settle into the riding grip as you land on the board.
 */
function launching(t, time) {
  const crouch = smooth(0, 0.3, t) * (1 - smooth(0.38, 0.52, t))
  const dive = smooth(0.38, 0.55, t) * (1 - smooth(0.82, 1, t))
  add('LegL1', -0.75, 0.08 * OUT_L, 0, crouch)
  add('LegL2', 1.35, 0, 0, crouch)
  add('LegR1', -0.75, 0.08 * OUT_R, 0, crouch)
  add('LegR2', 1.35, 0, 0, crouch)
  add('Spine1', -0.45, 0, 0, crouch)
  add('Neck1', 0.25, 0, 0, crouch)
  add('ArmL1', 0.95, 0.15 * OUT_L, 0, crouch)
  add('ArmR1', 0.95, 0.15 * OUT_R, 0, crouch)
  add('ArmL2', -0.35, 0, 0, crouch)
  add('ArmR2', -0.35, 0, 0, crouch)
  pose.lift -= 0.32 * crouch

  add('ArmL1', -2.95, 0.12 * OUT_L, 0, dive)
  add('ArmR1', -2.95, 0.12 * OUT_R, 0, dive)
  add('LegL1', 0.18, 0.06 * OUT_L, 0, dive)
  add('LegR1', 0.18, 0.06 * OUT_R, 0, dive)
  add('Spine1', 0.12, 0, 0, dive)
  add('Neck1', -0.5, 0, 0, dive)

  prone(time, 0, smooth(0.8, 1, t))
}

/**
 * Where in the kick (0-1) the foot meets the ball: the ball sets off at that moment
 * (roll/path.js, KICK_HIT).
 */
export const KICK_IMPACT = 0.52

/**
 * A place kick, `t` 0..1 (the holder moves the body forward - kick.runUpAt - this is the
 * pose within): a couple of steps in, the left foot planted beside the ball, the right leg
 * wound back with the body leaning away, then swung hard through the ball - the knee
 * snapping straight - and followed through high with the arms out for balance, before
 * settling.
 */
function kickPose(t, w) {
  const i = KICK_IMPACT
  // The approach: arms and legs pumping for the first steps in.
  const approach = smooth(0, 0.08, t) * (1 - smooth(i - 0.2, i - 0.1, t))
  const cycle = Math.sin(t * 38)
  add('LegL1', cycle * 0.5, 0, 0, approach * w)
  add('LegL2', Math.max(0, -cycle) * 0.8, 0, 0, approach * w)
  add('ArmL1', -cycle * 0.5, 0.1 * OUT_L, 0, approach * w)
  add('ArmR1', cycle * 0.5, 0.1 * OUT_R, 0, approach * w)
  add('ArmL2', -0.5, 0, 0, approach * w)
  add('ArmR2', -0.5, 0, 0, approach * w)
  add('Spine1', -0.15, 0, 0, approach * w)

  // Wound back, then through, then the follow-through (the windows hand over to each other).
  const wind = smooth(i - 0.26, i - 0.1, t) * (1 - smooth(i - 0.1, i - 0.02, t))
  const strike = smooth(i - 0.1, i - 0.02, t) * (1 - smooth(i + 0.08, i + 0.26, t))
  const through = smooth(i + 0.08, i + 0.26, t) * (1 - smooth(0.78, 1, t))
  // The planted left foot, from the last step in until it's all over.
  const plant = smooth(i - 0.22, i - 0.08, t) * (1 - smooth(0.82, 1, t))

  // The kicking leg: back with the knee folded, then forward and straight, then high.
  add('LegR1', 0.95, 0.06 * OUT_R, 0, wind * w)
  add('LegR2', 1.9, 0, 0, wind * w)
  add('LegR1', -1.25, 0.04 * OUT_R, 0, strike * w)
  add('LegR2', 0.25, 0, 0, strike * w)
  add('LegR1', -1.85, 0.1 * OUT_R, 0, through * w)
  add('LegR2', 0.05, 0, 0, through * w)
  // The standing leg: soaks it up.
  add('LegL1', -0.2, 0.06 * OUT_L, 0, plant * w)
  add('LegL2', 0.4, 0, 0, plant * w)
  // The body: leaning back and away on the wind-up, folding forward over the ball.
  add('Spine1', 0.18, 0, -0.3, wind * w)
  add('Spine1', -0.3, 0, 0.3, strike * w)
  add('Spine1', -0.12, 0, 0.2, through * w)
  add('Neck1', 0.25, 0, 0, strike * w)
  // The arms: the kicking side's back and the other's forward, out wide, then swapped
  // over as the leg comes through.
  add('ArmR1', 0.5, 0.85 * OUT_R, 0, wind * w)
  add('ArmL1', -0.7, 0.8 * OUT_L, 0, wind * w)
  add('ArmR1', 0.8, 0.6 * OUT_R, 0, strike * w)
  add('ArmL1', -0.9, 0.7 * OUT_L, 0, strike * w)
  add('ArmR1', 0.3, 1.0 * OUT_R, 0, through * w)
  add('ArmL1', -0.5, 1.0 * OUT_L, 0, through * w)
  add('ArmL2', -0.3, 0, 0, (wind + strike + through) * w)
  add('ArmR2', -0.3, 0, 0, (wind + strike + through) * w)
  pose.lift += -0.05 * plant * w
}


/** In the air off a ramp: arms flung out like wings, legs kicking apart. */
function flying(time, w) {
  const flap = Math.sin(time * 9) * 0.12
  add('ArmL1', 1.05, 1.15 * OUT_L + flap, 0, w)
  add('ArmR1', 1.05, 1.15 * OUT_R - flap, 0, w)
  add('ArmL2', 0.4, 0, 0, w)
  add('ArmR2', 0.4, 0, 0, w)
  add('LegL1', -0.35, 0.18 * OUT_L, 0, w)
  add('LegR1', 0.2, 0.18 * OUT_R, 0, w)
  add('LegL2', 0.5, 0, 0, w)
  add('Neck1', -0.2, 0, 0, w)
}

/** Arms up and waving, bouncing on the spot: the celebration once you've stopped. */
function cheering(time, w) {
  const wave = Math.sin(time * 10) * 0.28
  add('ArmL1', -2.7 + wave, 0.38 * OUT_L, 0, w)
  add('ArmR1', -2.7 - wave, 0.38 * OUT_R, 0, w)
  add('ArmL2', -0.25, 0, 0, w)
  add('ArmR2', -0.25, 0, 0, w)
  add('LegL1', -0.12, 0.06 * OUT_L, 0, w)
  add('LegR1', -0.12, 0.06 * OUT_R, 0, w)
  add('LegL2', 0.22, 0, 0, w)
  add('LegR2', 0.22, 0, 0, w)
  add('Spine1', 0.1, 0, 0, w)
  add('Neck1', -0.15, 0, 0, w)
  pose.lift += Math.abs(Math.sin(time * 7)) * 0.16 * w
}

/**
 * @param {{ time?: number, speed?: number, maxSpeed?: number, grounded?: boolean,
 *   vy?: number, stride?: number, sliding?: boolean, launch?: number, stand?: number,
 *   air?: number, kick?: number, run?: number, emote?: string|null }} motion
 *   `kick` (0-1) is the kick's swing (below 0 or above 1 for none).
 *   `run` (0-1) is how hard they're sprinting on the spot on a treadmill: legs and arms
 *   pumping as if at that share of top speed, going nowhere. (`stride` is the phase.)
 *   `sliding` lies the body down on the board; `speed` is then the slide's speed.
 *   While sliding, `launch` (0-1) is the dive onto the board, `air` (0-1) how far into
 *   a jump's pose, and `stand` (0-1) getting up to celebrate at the end.
 *   `emote` is a Boxity emote id to play over this pose, or null. It isn't posed here:
 *   the Bloxity avatar blends the emote clip on top of this pose (avatarRig.updateEmote),
 *   so the same motion object drives both. `emoteFromAnim(r.anim)` in bloxity/emotes.js
 *   turns another player's synced anim ('emote:<id>') into this field.
 */
export function computePose(motion) {
  const {
    time = 0,
    speed = 0,
    maxSpeed = 6,
    grounded = true,
    vy = 0,
    stride: phase = time * 5,
    sliding = false,
    launch = 1,
    stand = 0,
    air = 0,
    kick = -1,
    run = 0,
  } = motion
  for (const name of POSED_BONES) {
    const b = pose.bones[name]
    b.swing = 0
    b.sway = 0
    b.twist = 0
  }
  pose.lift = 0

  if (sliding) {
    if (launch < 1) launching(launch, time)
    else {
      prone(time, speed, 1 - stand)
      if (air > 0) flying(time, air)
      if (stand > 0) cheering(time, stand)
    }
    return pose
  }
  // Kicking (`kick` 0-1 through the swing, below 0 or above 1 for none): eased in and
  // out over the stance.
  const kicking = kick >= 0 && kick <= 1
  const kickWeight = kicking ? smooth(0, 0.1, kick) * (1 - smooth(0.9, 1, kick)) : 0
  if (kicking) {
    stance(1 - kickWeight, time)
    kickPose(kick, kickWeight)
  } else if (grounded) {
    // Walking, or sprinting on the spot on a treadmill (`run`): the same stride, at the
    // pace asked for.
    const ratio = Math.max(clamp01(speed / Math.max(maxSpeed, 0.001)), clamp01(run) * 0.95)
    const still = 1 - smooth(0.05, 0.4, ratio)
    stance(still, time)
    if (ratio > 0.02) stride(phase, ratio)
  } else {
    airborne(vy)
  }
  return pose
}
