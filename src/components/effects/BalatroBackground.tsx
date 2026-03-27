import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { useSettingsStore } from '../../utils/settings'

export type BackgroundMood = 'neutral' | 'profit' | 'loss' | 'danger' | 'shop'

// ─── Mood → 3-color mapping ─────────────────────────────────────

const MOOD_COLORS: Record<BackgroundMood, [string, string, string]> = {
  neutral: ['#2d1b4e', '#1b3a2e', '#1a1a2e'],
  profit:  ['#1b4a2e', '#2d4a1b', '#1a2e1e'],
  loss:    ['#4a1b1b', '#3a1b2e', '#2e1a1a'],
  danger:  ['#5a1515', '#601818', '#2e1515'],
  shop:    ['#3d1b5e', '#4a1b5e', '#221a2e'],
}

function hexToVec4(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ]
}

function lerpColor(a: [number, number, number, number], b: [number, number, number, number], t: number): [number, number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    1,
  ]
}

// ─── Shaders ─────────────────────────────────────────────────────

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`

const fragmentShader = `
precision highp float;
#define PI 3.14159265359

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / uPixelFilter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
    float uv_len = length(uv);

    float speed = (uSpinRotation * uSpinEase * 0.2);
    if(uIsRotate){
       speed = iTime * speed;
    }
    speed += 302.2;

    float mouseInfluence = (uMouse.x * 2.0 - 1.0);
    speed += mouseInfluence * 0.1;

    float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);

    uv *= 30.0;
    float baseSpeed = iTime * uSpinSpeed;
    speed = baseSpeed + mouseInfluence * 2.0;

    vec2 uv2 = vec2(uv.x + uv.y);

    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }

    float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);

    return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
    vec2 uv = vUv * iResolution.xy;
    gl_FragColor = effect(iResolution.xy, uv);
}
`

// ─── CSS 폴백 (WebGL 실패 시) ────────────────────────────────────

const CSS_PALETTES: Record<BackgroundMood, { base: string; colors: string[] }> = {
  neutral: { base: '#1a1a2e', colors: ['#2d1b4e', '#1b3a2e', '#2e1b3a', '#1b2e3a'] },
  profit:  { base: '#1a2e1e', colors: ['#1b4a2e', '#2d4a1b', '#1b3a2e', '#1e3a1b'] },
  loss:    { base: '#2e1a1a', colors: ['#4a1b1b', '#3a1b2e', '#4e2020', '#3a2020'] },
  danger:  { base: '#2e1515', colors: ['#5a1515', '#4a1020', '#601818', '#4a1515'] },
  shop:    { base: '#221a2e', colors: ['#3d1b5e', '#2e1b4a', '#4a1b5e', '#2d1b4e'] },
}

function CSSFallback({ mood }: { mood: BackgroundMood }) {
  const p = CSS_PALETTES[mood]
  return (
    <div
      className="fixed inset-0 transition-colors duration-[2000ms]"
      style={{
        background: `
          radial-gradient(ellipse at 20% 50%, ${p.colors[0]} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, ${p.colors[1]} 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, ${p.colors[2]} 0%, transparent 50%),
          radial-gradient(ellipse at 10% 90%, ${p.colors[3]} 0%, transparent 40%),
          ${p.base}
        `,
      }}
    />
  )
}

// ─── Main Component ──────────────────────────────────────────────

interface BalatroBackgroundProps {
  mood?: BackgroundMood
}

export function BalatroBackground({ mood = 'neutral' }: BalatroBackgroundProps) {
  const bgEffect = useSettingsStore((s) => s.bgEffect)
  const containerRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<{
    renderer: InstanceType<typeof Renderer>
    program: InstanceType<typeof Program>
    mesh: InstanceType<typeof Mesh>
    animId: number
    targetColors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]]
    currentColors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]]
  } | null>(null)
  const failedRef = useRef(false)
  const moodRef = useRef(mood)

  // Update target colors when mood changes
  useEffect(() => {
    moodRef.current = mood
    const [c1, c2, c3] = MOOD_COLORS[mood]
    if (glRef.current) {
      glRef.current.targetColors = [hexToVec4(c1), hexToVec4(c2), hexToVec4(c3)]
    }
  }, [mood])

  useEffect(() => {
    if (!containerRef.current || failedRef.current) return
    const container = containerRef.current

    try {
      const renderer = new Renderer({ alpha: false })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, 1)

      const [c1, c2, c3] = MOOD_COLORS[moodRef.current]
      const initC1 = hexToVec4(c1)
      const initC2 = hexToVec4(c2)
      const initC3 = hexToVec4(c3)

      function resize() {
        renderer.setSize(container.offsetWidth, container.offsetHeight)
        if (program) {
          program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
        }
      }

      const geometry = new Triangle(gl)
      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
          uSpinRotation: { value: -2.0 },
          uSpinSpeed: { value: 7.0 },
          uOffset: { value: [0.0, 0.0] },
          uColor1: { value: [...initC1] },
          uColor2: { value: [...initC2] },
          uColor3: { value: [...initC3] },
          uContrast: { value: 3.5 },
          uLighting: { value: 0.4 },
          uSpinAmount: { value: 0.25 },
          uPixelFilter: { value: 745.0 },
          uSpinEase: { value: 1.0 },
          uIsRotate: { value: false },
          uMouse: { value: [0.5, 0.5] },
        },
      })

      const mesh = new Mesh(gl, { geometry, program })

      glRef.current = {
        renderer,
        program,
        mesh,
        animId: 0,
        targetColors: [initC1, initC2, initC3],
        currentColors: [[...initC1], [...initC2], [...initC3]],
      }

      const LERP_SPEED = 0.03 // ~1s at 60fps

      function update(time: number) {
        glRef.current!.animId = requestAnimationFrame(update)

        // Lerp colors toward target
        const ref = glRef.current!
        for (let i = 0; i < 3; i++) {
          ref.currentColors[i] = lerpColor(
            ref.currentColors[i] as [number, number, number, number],
            ref.targetColors[i],
            LERP_SPEED
          )
        }
        program.uniforms.uColor1.value = ref.currentColors[0]
        program.uniforms.uColor2.value = ref.currentColors[1]
        program.uniforms.uColor3.value = ref.currentColors[2]

        program.uniforms.iTime.value = time * 0.001
        renderer.render({ scene: mesh })
      }

      window.addEventListener('resize', resize)
      resize()
      container.appendChild(gl.canvas)
      glRef.current.animId = requestAnimationFrame(update)

      function handleMouseMove(e: MouseEvent) {
        const rect = container.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = 1.0 - (e.clientY - rect.top) / rect.height
        program.uniforms.uMouse.value = [x, y]
      }
      container.addEventListener('mousemove', handleMouseMove)

      return () => {
        cancelAnimationFrame(glRef.current?.animId ?? 0)
        window.removeEventListener('resize', resize)
        container.removeEventListener('mousemove', handleMouseMove)
        if (gl.canvas.parentNode === container) {
          container.removeChild(gl.canvas)
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        glRef.current = null
      }
    } catch {
      failedRef.current = true
    }
  }, [])

  if (!bgEffect) return null

  if (failedRef.current) {
    return <CSSFallback mood={mood} />
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
    />
  )
}
