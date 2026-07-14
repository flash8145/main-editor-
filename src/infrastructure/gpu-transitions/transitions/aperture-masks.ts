import type { GpuTransitionDefinition } from '../types'

/**
 * GPU ports of the Iris-shape and Shape aperture transitions (bug #9).
 *
 * These previously had `gpuTransitionId: null` and rendered through the slow
 * CPU Canvas-2D fallback (`createIrisRenderer` / `createShapeRenderer` in
 * `shared/timeline/transitions/renderers/{iris,shape}.ts`), decoding each
 * participant frame with mediabunny WASM during playback. Each shader here
 * reproduces the same aperture reveal on the GPU: the incoming (right) clip
 * shows inside the growing aperture, the outgoing (left) clip outside — matching
 * the CPU renderers' `rect + aperture` even-odd clip. The CPU `renderCanvas`
 * methods stay as the true no-WebGPU fallback and must stay visually consistent.
 *
 * Aperture geometry is generated here from the SAME formulas the CPU renderers
 * use (polygonPoints / getStarPoints / unit-point lists) so the two paths match.
 */

interface Point {
  x: number
  y: number
}

function polygonPoints(sides: number, rotation = -Math.PI / 2): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2
    return { x: Math.cos(angle), y: Math.sin(angle) }
  })
}

function starPoints(): Point[] {
  const points: Point[] = []
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2
    const radius = index % 2 === 0 ? 1 : 0.42
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return points
}

// Unit aperture polygons — copied from the CPU renderers so both paths agree.
const IRIS_UNIT_POINTS: Record<string, Point[]> = {
  arrow: [
    { x: 0, y: -1 },
    { x: 0.68, y: 1 },
    { x: 0, y: 0.36 },
    { x: -0.68, y: 1 },
  ],
  cross: [
    { x: -0.28, y: -1 },
    { x: 0.28, y: -1 },
    { x: 0.28, y: -0.28 },
    { x: 1, y: -0.28 },
    { x: 1, y: 0.28 },
    { x: 0.28, y: 0.28 },
    { x: 0.28, y: 1 },
    { x: -0.28, y: 1 },
    { x: -0.28, y: 0.28 },
    { x: -1, y: 0.28 },
    { x: -1, y: -0.28 },
    { x: -0.28, y: -0.28 },
  ],
  diamond: polygonPoints(4),
  hexagon: polygonPoints(6, 0),
  pentagon: polygonPoints(5),
  square: [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ],
  triangle: polygonPoints(3),
}

const MAX_POLYGON_VERTS = 12

/** WGSL: even-odd point-in-polygon (PNPOLY crossing-number). */
const POLYGON_HELPER_WGSL = /* wgsl */ `
fn pointInPolygonEvenOdd(pt: vec2f, poly: ptr<function, array<vec2f, ${MAX_POLYGON_VERTS}>>, n: i32) -> bool {
  var inside = false;
  var j = n - 1;
  for (var i = 0; i < n; i = i + 1) {
    let vi = (*poly)[i];
    let vj = (*poly)[j];
    if (((vi.y > pt.y) != (vj.y > pt.y)) &&
        (pt.x < (vj.x - vi.x) * (pt.y - vi.y) / (vj.y - vi.y) + vi.x)) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}
`

function wgslFloat(value: number): string {
  if (!Number.isFinite(value)) return '0.0'
  let text = value.toFixed(6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '.0')
  if (!text.includes('.')) text = `${text}.0`
  return text
}

function fillPolygonVertsWgsl(points: Point[]): string {
  const lines = points.map(
    (point, index) =>
      `  verts[${index}] = vec2f(${wgslFloat(point.x)}, ${wgslFloat(point.y)});`,
  )
  return lines.join('\n')
}

/** `inside` body for a centered, iris-scaled polygon aperture. */
function polygonInsideBody(points: Point[]): string {
  return `
  let scale = max(p * max(w, h) * 1.45, 0.0001);
  let q = (pixelPos - center) / scale;
  var verts: array<vec2f, ${MAX_POLYGON_VERTS}>;
${fillPolygonVertsWgsl(points)}
  let inside = select(0.0, 1.0, pointInPolygonEvenOdd(q, &verts, ${points.length}));`
}

/**
 * Iris shader: incoming dims in from 0.9→1.0 alpha, outgoing dims by
 * `outgoingDim`·progress — matching `createIrisRenderer`.
 */
function irisShader(entryPoint: string, insideBody: string): string {
  return /* wgsl */ `
struct ApertureParams {
  progress: f32,
  width: f32,
  height: f32,
  outgoingDim: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: ApertureParams;
${POLYGON_HELPER_WGSL}
@fragment
fn ${entryPoint}(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);
  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);
  let w = params.width;
  let h = params.height;
  let center = vec2f(w * 0.5, h * 0.5);
  let pixelPos = uv * vec2f(w, h);
${insideBody}
  let incomingOpacity = 0.9 + 0.1 * p;
  let outgoingOpacity = 1.0 - clamp(params.outgoingDim, 0.0, 0.12) * p;
  let incoming = vec4f(right.rgb * incomingOpacity, right.a * incomingOpacity);
  let outgoing = vec4f(left.rgb * outgoingOpacity, left.a * outgoingOpacity);
  return mix(outgoing, incoming, inside);
}`
}

/** Shape shader: plain reveal, no dim — matching `createShapeRenderer`. */
function shapeShader(entryPoint: string, insideBody: string): string {
  return /* wgsl */ `
struct ApertureParams {
  progress: f32,
  width: f32,
  height: f32,
  _pad: f32,
};

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var leftTex: texture_2d<f32>;
@group(0) @binding(2) var rightTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: ApertureParams;
${POLYGON_HELPER_WGSL}
@fragment
fn ${entryPoint}(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let p = clamp(params.progress, 0.0, 1.0);
  let left = textureSample(leftTex, texSampler, uv);
  let right = textureSample(rightTex, texSampler, uv);
  let w = params.width;
  let h = params.height;
  let center = vec2f(w * 0.5, h * 0.5);
  let pixelPos = uv * vec2f(w, h);
${insideBody}
  return mix(left, right, inside);
}`
}

function irisPolygonDef(id: string, name: string, shape: string): GpuTransitionDefinition {
  const entryPoint = `${id}Fragment`
  const points = IRIS_UNIT_POINTS[shape]
  if (!points) throw new Error(`Unknown iris polygon shape: ${shape}`)
  return {
    id,
    name,
    category: 'iris',
    hasDirection: false,
    entryPoint,
    uniformSize: 16,
    shader: irisShader(entryPoint, polygonInsideBody(points)),
    packUniforms: (progress, width, height, _direction, properties) => {
      const outgoingDim = (properties?.outgoingDim as number) ?? 0.06
      return new Float32Array([progress, width, height, outgoingDim])
    },
  }
}

function irisAnalyticDef(id: string, name: string, insideBody: string): GpuTransitionDefinition {
  const entryPoint = `${id}Fragment`
  return {
    id,
    name,
    category: 'iris',
    hasDirection: false,
    entryPoint,
    uniformSize: 16,
    shader: irisShader(entryPoint, insideBody),
    packUniforms: (progress, width, height, _direction, properties) => {
      const outgoingDim = (properties?.outgoingDim as number) ?? 0.06
      return new Float32Array([progress, width, height, outgoingDim])
    },
  }
}

function shapeDef(id: string, name: string, insideBody: string): GpuTransitionDefinition {
  const entryPoint = `${id}Fragment`
  return {
    id,
    name,
    category: 'shape',
    hasDirection: false,
    entryPoint,
    uniformSize: 16,
    shader: shapeShader(entryPoint, insideBody),
    packUniforms: (progress, width, height) => {
      return new Float32Array([progress, width, height, 0])
    },
  }
}

// --- Iris family (9) ---

export const arrowIris = irisPolygonDef('arrowIris', 'Arrow Iris', 'arrow')
export const crossIris = irisPolygonDef('crossIris', 'Cross Iris', 'cross')
export const diamondIris = irisPolygonDef('diamondIris', 'Diamond Iris', 'diamond')
export const hexagonIris = irisPolygonDef('hexagonIris', 'Hexagon Iris', 'hexagon')
export const pentagonIris = irisPolygonDef('pentagonIris', 'Pentagon Iris', 'pentagon')
export const squareIris = irisPolygonDef('squareIris', 'Square Iris', 'square')
export const triangleIris = irisPolygonDef('triangleIris', 'Triangle Iris', 'triangle')

export const ovalIris = irisAnalyticDef(
  'ovalIris',
  'Oval Iris',
  /* wgsl */ `
  let scale = max(p * max(w, h) * 1.45, 0.0001);
  let aspect = select(0.85, 1.15, w >= h);
  let rx = scale * aspect;
  let ry = scale * 0.72;
  let d = (pixelPos - center) / vec2f(rx, ry);
  let inside = select(0.0, 1.0, dot(d, d) <= 1.0);`,
)

// Eye = pointed lens (vesica-like). The CPU eye is two cubic beziers meeting at
// points at (±rx, 0); a parabolic half-height (ry·(1−nx²)) reproduces the
// pointed-lens silhouette closely enough for the aperture reveal.
export const eyeIris = irisAnalyticDef(
  'eyeIris',
  'Eye Iris',
  /* wgsl */ `
  let scale = max(p * max(w, h) * 1.45, 0.0001);
  let rx = scale * 1.02;
  let ry = scale * 0.42;
  let nx = (pixelPos.x - center.x) / rx;
  let ny = (pixelPos.y - center.y) / ry;
  let halfH = max(1.0 - nx * nx, 0.0);
  let inside = select(0.0, 1.0, abs(nx) <= 1.0 && abs(ny) <= halfH);`,
)

// --- Shape family (5) ---

export const boxShape = shapeDef(
  'boxShape',
  'Box',
  /* wgsl */ `
  let scale = max(p * max(w * 0.5, h / (2.0 * 0.62)) * 1.12, 0.0001);
  let q = (pixelPos - center) / scale;
  let inside = select(0.0, 1.0, abs(q.x) <= 1.0 && abs(q.y) <= 0.62);`,
)

export const starShape = shapeDef(
  'starShape',
  'Star',
  `
  let scale = max(p * max(w, h) * 1.45, 0.0001);
  let q = (pixelPos - center) / scale;
  var verts: array<vec2f, ${MAX_POLYGON_VERTS}>;
${fillPolygonVertsWgsl(starPoints())}
  let inside = select(0.0, 1.0, pointInPolygonEvenOdd(q, &verts, ${starPoints().length}));`,
)

// Implicit heart (x²+y²−1)³ − x²y³ ≤ 0, y flipped so the point sits at the
// bottom like the CPU bezier heart. Scale tuned to roughly match its extent.
export const heartShape = shapeDef(
  'heartShape',
  'Heart',
  /* wgsl */ `
  let scale = max(p * max(w, h) * 1.45, 0.0001);
  let hs = scale * 0.9;
  let mx = (pixelPos.x - center.x) / hs;
  let my = -(pixelPos.y - center.y) / hs;
  let base = mx * mx + my * my - 1.0;
  let heartVal = base * base * base - mx * mx * my * my * my;
  let inside = select(0.0, 1.0, heartVal <= 0.0);`,
)

// Corner-growing right triangles in normalized uv space — the CPU version grows
// each leg by progress·2.24 along width/height from the corner.
export const triangleLeftShape = shapeDef(
  'triangleLeftShape',
  'Triangle Left',
  /* wgsl */ `
  let k = p * 2.24;
  let inside = select(0.0, 1.0, (uv.x + uv.y) <= k);`,
)

export const triangleRightShape = shapeDef(
  'triangleRightShape',
  'Triangle Right',
  /* wgsl */ `
  let k = p * 2.24;
  let inside = select(0.0, 1.0, ((1.0 - uv.x) + uv.y) <= k);`,
)
