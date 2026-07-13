import type { GpuTransitionDefinition } from '../types'

const ALL_WIPE_DIRECTIONS = ['from-left', 'from-right', 'from-top', 'from-bottom']

export const edgeWipe: GpuTransitionDefinition = {
  id: 'edgeWipe',
  name: 'Edge Wipe',
  category: 'wipe',
  hasDirection: true,
  directions: ALL_WIPE_DIRECTIONS,
  entryPoint: 'edgeWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct EdgeWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  direction: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: EdgeWipeParams;

@fragment
fn edgeWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let dir = u32(params.direction);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  var sweepPos: f32;
  if (dir == 0u) { sweepPos = uv.x; }
  else if (dir == 1u) { sweepPos = 1.0 - uv.x; }
  else if (dir == 2u) { sweepPos = uv.y; }
  else { sweepPos = 1.0 - uv.y; }

  let t = step(sweepPos, params.progress);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height, direction) => {
    return new Float32Array([progress, width, height, direction])
  },
}

export const centerWipe: GpuTransitionDefinition = {
  id: 'centerWipe',
  name: 'Center Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'centerWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct CenterWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: CenterWipeParams;

@fragment
fn centerWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  let sideWidth = 0.5 * (1.0 - p);
  let t = step(sideWidth, uv.x) * step(uv.x, 1.0 - sideWidth);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}

export const bandWipe: GpuTransitionDefinition = {
  id: 'bandWipe',
  name: 'Band Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'bandWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct BandWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: BandWipeParams;

@fragment
fn bandWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  let rowIndex = floor(uv.y * 10.0);
  let isOdd = (rowIndex - 2.0 * floor(rowIndex * 0.5)) >= 1.0;
  let stagger = select(0.0, 0.18, isOdd);
  let denom = max(0.2, 1.0 - stagger);
  let local = clamp((p - stagger) / denom, 0.0, 1.0);

  var t: f32;
  if (isOdd) {
    t = step(1.0 - local, uv.x);
  } else {
    t = step(uv.x, local);
  }
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}

export const venetianBlindWipe: GpuTransitionDefinition = {
  id: 'venetianBlindWipe',
  name: 'Venetian Blind Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'venetianBlindWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct VenetianBlindWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: VenetianBlindWipeParams;

@fragment
fn venetianBlindWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  let rowLocalY = fract(uv.y * 10.0);
  let t = step(1.0 - p, rowLocalY);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}

export const radialWipe: GpuTransitionDefinition = {
  id: 'radialWipe',
  name: 'Radial Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'radialWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct RadialWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: RadialWipeParams;

@fragment
fn radialWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  let pixelPos = uv * vec2f(params.width, params.height);
  let center = vec2f(params.width * 0.5, params.height * 0.5);
  let delta = pixelPos - center;
  let angle = atan2(delta.y, delta.x);

  let segAngle = PI * 0.5;
  let a = angle + PI * 0.5;
  let wrapped = a - floor(a / segAngle) * segAngle;
  let t = step(wrapped, p * segAngle);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}

export const xWipe: GpuTransitionDefinition = {
  id: 'xWipe',
  name: 'X Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'xWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct XWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: XWipeParams;

fn xWipeSdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.001), 0.0, 1.0);
  return length(pa - ba * h);
}

@fragment
fn xWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);

  let w = params.width;
  let h = params.height;
  let pixelPos = uv * vec2f(w, h);
  let strokeWidth = length(vec2f(w, h)) * p * 0.36;

  let d1 = xWipeSdSegment(pixelPos, vec2f(0.0, 0.0), vec2f(w, h));
  let d2 = xWipeSdSegment(pixelPos, vec2f(w, 0.0), vec2f(0.0, h));
  let dist = min(d1, d2);

  let t = step(dist, strokeWidth * 0.5);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}

export const spiralWipe: GpuTransitionDefinition = {
  id: 'spiralWipe',
  name: 'Spiral Wipe',
  category: 'wipe',
  hasDirection: false,
  entryPoint: 'spiralWipeFragment',
  uniformSize: 16,
  shader: /* wgsl */ `
struct SpiralWipeParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: SpiralWipeParams;

@fragment
fn spiralWipeFragment(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);

  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);
  if (p <= 0.0) {
    return left;
  }

  let diag = length(vec2f(params.width, params.height));
  let pixelPos = uv * vec2f(params.width, params.height);
  let center = vec2f(params.width * 0.5, params.height * 0.5);
  let delta = pixelPos - center;
  let radius = length(delta);
  var angle = atan2(delta.y, delta.x);
  if (angle < 0.0) {
    angle = angle + TAU;
  }

  let turns = 3.8;
  let maxRadius = diag * 0.58;
  let spacing = maxRadius / turns;
  let strokeWidth = spacing * (0.04 + p * 1.25);

  var dist = 1e9;
  for (var k = 0; k < 4; k = k + 1) {
    let armAngle = angle + TAU * f32(k);
    let armRadius = maxRadius * armAngle / (TAU * turns);
    dist = min(dist, abs(radius - armRadius));
  }

  let t = step(dist, strokeWidth * 0.5);
  return mix(left, right, t);
}`,
  packUniforms: (progress, width, height) => {
    return new Float32Array([progress, width, height, 0])
  },
}
