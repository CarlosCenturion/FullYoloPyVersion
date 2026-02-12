import React, { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

interface IntroAnimationProps {
  onComplete: () => void
}

// ============================================================
// DATA
// ============================================================

const MATRIX_CHARS = [
  'YOLO', 'BBOX', 'NMS', 'CONF', 'TENSOR', 'INFER', 'DETECT', 'TRACK',
  'CNN', 'FPN', 'RPN', 'IoU', 'mAP', 'GPU', 'CUDA', 'BATCH',
  'STRIDE', 'ANCHOR', 'CLASS', 'SCORE', 'FRAME', 'PIXEL', 'GRID',
  'LAYER', 'CONV', 'POOL', 'RELU', 'SOFT', 'DENSE', 'DROP',
  '0x4F2A', '0xBB01', '0xFF3C', '0xA7D2', '0x1E09',
  '01101', '10110', '11010', '00111', '10011', '01010',
  'P3', 'P4', 'P5', 'C3', 'C4', 'C5', 'S8', 'S16', 'S32',
]

const BBOX_DATA = [
  { label: 'person', conf: 94, x: 8, y: 15, w: 18, h: 35 },
  { label: 'car', conf: 87, x: 72, y: 45, w: 22, h: 20 },
  { label: 'dog', conf: 91, x: 35, y: 55, w: 15, h: 18 },
  { label: 'laptop', conf: 82, x: 55, y: 20, w: 16, h: 12 },
  { label: 'bottle', conf: 76, x: 20, y: 65, w: 8, h: 15 },
  { label: 'chair', conf: 88, x: 80, y: 70, w: 14, h: 20 },
]

// ============================================================
// EYE PARTICLE GENERATION
// ============================================================

function generateEyeParticles(): { positions: Float32Array; targets: Float32Array; sizes: Float32Array; speeds: Float32Array } {
  const count = 3500
  const positions = new Float32Array(count * 3)
  const targets = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)

  let idx = 0

  // Helper to add a particle
  const add = (tx: number, ty: number, tz: number, size: number) => {
    if (idx >= count) return
    // Start position: random near center with some spread
    positions[idx * 3] = (Math.random() - 0.5) * 0.5
    positions[idx * 3 + 1] = (Math.random() - 0.5) * 0.5
    positions[idx * 3 + 2] = (Math.random() - 0.5) * 2
    // Target position
    targets[idx * 3] = tx
    targets[idx * 3 + 1] = ty
    targets[idx * 3 + 2] = tz
    sizes[idx] = size
    speeds[idx] = 0.5 + Math.random() * 1.5
    idx++
  }

  // OUTER EYE SHAPE (almond) - ~800 particles
  for (let i = 0; i < 800; i++) {
    const t = (i / 800) * Math.PI * 2
    const eyeW = 3.5
    const eyeH = 1.2
    const x = Math.cos(t) * eyeW
    // Sharpen the eye tips
    const sharpness = Math.pow(Math.abs(Math.sin(t)), 0.7) * Math.sign(Math.sin(t))
    const y = sharpness * eyeH
    const z = (Math.random() - 0.5) * 0.15
    const jitter = 0.06
    add(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      z,
      1.5 + Math.random() * 1.5
    )
  }

  // IRIS - concentric rings (~1200 particles)
  for (let ring = 0; ring < 6; ring++) {
    const r = 0.3 + ring * 0.18
    const pointsInRing = 150 + ring * 30
    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * Math.PI * 2 + ring * 0.3
      const jitter = 0.04
      add(
        Math.cos(angle) * r + (Math.random() - 0.5) * jitter,
        Math.sin(angle) * r + (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * 0.1,
        1.0 + Math.random() * 2.0
      )
    }
  }

  // PUPIL - dense cluster at center (~500 particles)
  for (let i = 0; i < 500; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 0.25
    add(
      Math.cos(angle) * r,
      Math.sin(angle) * r,
      (Math.random() - 0.5) * 0.08,
      2.0 + Math.random() * 3.0
    )
  }

  // CIRCUIT LINES from center outward (~400 particles)
  const lineAngles = [0, 45, 90, 135, 180, 225, 270, 315]
  for (const deg of lineAngles) {
    const rad = (deg * Math.PI) / 180
    for (let j = 0; j < 50; j++) {
      const dist = 0.3 + (j / 50) * 1.5
      add(
        Math.cos(rad) * dist,
        Math.sin(rad) * dist,
        0,
        0.8 + Math.random() * 0.5
      )
    }
  }

  // Fill remaining with extra iris detail
  while (idx < count) {
    const angle = Math.random() * Math.PI * 2
    const r = 0.2 + Math.random() * 1.2
    add(
      Math.cos(angle) * r + (Math.random() - 0.5) * 0.05,
      Math.sin(angle) * r + (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.1,
      1.0 + Math.random() * 1.5
    )
  }

  return { positions, targets, sizes, speeds }
}

function generateDustParticles(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10
    positions[i * 3 + 2] = -2 - Math.random() * 8
  }
  return positions
}

// ============================================================
// MATRIX RAIN COLUMN GENERATION
// ============================================================

interface MatrixColumn {
  x: number
  chars: string[]
  speed: number
  delay: number
  opacity: number
  fontSize: number
}

function generateMatrixColumns(count: number): MatrixColumn[] {
  const cols: MatrixColumn[] = []
  for (let i = 0; i < count; i++) {
    const charCount = 8 + Math.floor(Math.random() * 20)
    const chars: string[] = []
    for (let j = 0; j < charCount; j++) {
      chars.push(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
    }
    cols.push({
      x: (i / count) * 100 + (Math.random() - 0.5) * (100 / count),
      chars,
      speed: 2 + Math.random() * 5,
      delay: Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.4,
      fontSize: 9 + Math.floor(Math.random() * 5),
    })
  }
  return cols
}

// ============================================================
// COMPONENT
// ============================================================

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  const matrixColumns = useMemo(() => generateMatrixColumns(30), [])

  const titleText = 'THE CHARLY ALL-SEEING EYE'

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Read accent color from CSS variable
    const style = getComputedStyle(document.documentElement)
    const accentHex = style.getPropertyValue('--accent').trim() || '#00ffcc'
    const accentColor = new THREE.Color(accentHex)

    // ==========================================
    // THREE.JS SETUP
    // ==========================================
    const width = window.innerWidth
    const height = window.innerHeight

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0d1117, 1)
    rendererRef.current = renderer

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0, 6)
    camera.lookAt(0, 0, 0)

    // ==========================================
    // EYE PARTICLES
    // ==========================================
    const eyeData = generateEyeParticles()
    const eyeGeometry = new THREE.BufferGeometry()
    eyeGeometry.setAttribute('position', new THREE.BufferAttribute(eyeData.positions, 3))
    eyeGeometry.setAttribute('aTarget', new THREE.BufferAttribute(eyeData.targets, 3))
    eyeGeometry.setAttribute('aSize', new THREE.BufferAttribute(eyeData.sizes, 1))
    eyeGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(eyeData.speeds, 1))

    const eyeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: accentColor },
        uTime: { value: 0 },
        uProgress: { value: 0 },      // 0 = spawn positions, 1 = target positions
        uScanY: { value: 10 },        // scan line Y in world space
        uBrightness: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aTarget;
        attribute float aSize;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uProgress;
        uniform float uScanY;
        uniform float uPixelRatio;
        varying float vBrightness;
        varying float vDist;

        void main() {
          // Interpolate from start to target based on progress
          float p = clamp(uProgress * aSpeed, 0.0, 1.0);
          // Ease out cubic
          float ep = 1.0 - pow(1.0 - p, 3.0);
          vec3 pos = mix(position, aTarget, ep);

          // Add subtle breathing motion once in place
          float breathe = sin(uTime * 2.0 + aTarget.x * 3.0 + aTarget.y * 5.0) * 0.02 * ep;
          pos.x += breathe;
          pos.y += breathe * 0.7;

          // Iris rotation (particles within r=1.5 from center)
          float dist = length(aTarget.xy);
          vDist = dist;
          if (dist < 1.5 && dist > 0.15) {
            float rotSpeed = 0.3 / max(dist, 0.3);
            float angle = uTime * rotSpeed;
            float c = cos(angle);
            float s = sin(angle);
            vec2 rotated = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);
            pos.x = mix(pos.x, rotated.x, ep);
            pos.y = mix(pos.y, rotated.y, ep);
          }

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;

          // Size with attenuation
          float sizeBase = aSize * uPixelRatio;
          gl_PointSize = sizeBase * (300.0 / -mvPos.z);

          // Scan line brightness boost
          float scanDist = abs(pos.y - uScanY);
          float scanBoost = smoothstep(0.8, 0.0, scanDist) * 2.0;

          // Pupil particles are brighter
          float pupilBoost = dist < 0.25 ? 1.5 : 1.0;

          vBrightness = (0.4 + 0.6 * ep) * pupilBoost + scanBoost;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBrightness;
        varying float vBrightness;
        varying float vDist;

        void main() {
          // Circular point
          vec2 center = gl_PointCoord - 0.5;
          float d = length(center);
          if (d > 0.5) discard;

          // Soft glow falloff
          float alpha = smoothstep(0.5, 0.1, d);
          float brightness = vBrightness * uBrightness;

          // Core is white-hot, outer is colored
          vec3 color = mix(uColor, vec3(1.0), smoothstep(0.3, 0.0, d) * 0.5);

          gl_FragColor = vec4(color * brightness, alpha * brightness);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const eyePoints = new THREE.Points(eyeGeometry, eyeMaterial)
    scene.add(eyePoints)

    // ==========================================
    // DUST PARTICLES
    // ==========================================
    const dustCount = 400
    const dustPositions = generateDustParticles(dustCount)
    const dustGeometry = new THREE.BufferGeometry()
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))

    const dustMaterial = new THREE.PointsMaterial({
      color: accentColor,
      size: 0.03,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    const dustPoints = new THREE.Points(dustGeometry, dustMaterial)
    scene.add(dustPoints)

    // ==========================================
    // ANIMATION STATE
    // ==========================================
    let startTime = performance.now()
    let isRunning = true

    // ==========================================
    // GSAP TIMELINE (HTML overlays)
    // ==========================================
    const tl = gsap.timeline({
      onComplete: () => {
        isRunning = false
        onComplete()
      },
    })
    timelineRef.current = tl

    // Matrix rain columns fade in staggered
    tl.from('.matrix-col', {
      opacity: 0,
      stagger: { each: 0.08, from: 'random' },
      duration: 0.5,
    }, 0)

    // Matrix columns animate downward (continuous rain effect)
    tl.to('.matrix-col', {
      y: '+=100vh',
      duration: 5,
      ease: 'none',
      stagger: { each: 0.03, from: 'random' },
    }, 0.3)

    // Bounding boxes appear staggered
    tl.from('.bbox-container', {
      opacity: 0,
      scale: 0.3,
      stagger: 0.15,
      duration: 0.4,
      ease: 'back.out(1.5)',
    }, 3.0)

    // Confidence counters
    BBOX_DATA.forEach((box, i) => {
      const counterEl = container.querySelector(`.bbox-conf-${i}`)
      if (counterEl) {
        tl.fromTo(counterEl, { textContent: '0' }, {
          textContent: String(box.conf),
          duration: 0.6,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onUpdate: function() {
            const val = Math.round(parseFloat(gsap.getProperty(counterEl, 'textContent') as string))
            counterEl.textContent = String(val)
          },
        }, 3.0 + i * 0.15)
      }
    })

    // Title letters appear
    tl.from('.intro-letter', {
      opacity: 0,
      y: 30,
      rotateX: -90,
      stagger: 0.03,
      duration: 0.4,
      ease: 'back.out(2)',
    }, 4.0)

    // Subtitle
    tl.from('.intro-subtitle', {
      opacity: 0,
      y: 15,
      duration: 0.6,
      ease: 'power2.out',
    }, 4.8)

    // Fade out bounding boxes
    tl.to('.bbox-container', {
      opacity: 0,
      stagger: 0.05,
      duration: 0.3,
    }, 5.5)

    // Fade out matrix
    tl.to('.matrix-col', {
      opacity: 0,
      stagger: { each: 0.02, from: 'random' },
      duration: 0.4,
    }, 5.5)

    // Final fade out
    tl.to(container, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
    }, 6.0)

    // ==========================================
    // RENDER LOOP
    // ==========================================
    const animate = () => {
      if (!isRunning) return

      const elapsed = (performance.now() - startTime) / 1000

      // Update uniforms
      eyeMaterial.uniforms.uTime.value = elapsed

      // Progress: particles move to target positions between t=1 and t=2.5
      const progress = Math.max(0, Math.min(1, (elapsed - 0.8) / 1.5))
      eyeMaterial.uniforms.uProgress.value = progress

      // Scan line at t=2.5 sweeps from y=2 to y=-2
      const scanStart = 2.5
      const scanDuration = 1.0
      const scanProgress = (elapsed - scanStart) / scanDuration
      if (scanProgress >= 0 && scanProgress <= 1) {
        eyeMaterial.uniforms.uScanY.value = 2.0 - scanProgress * 4.0
      } else {
        eyeMaterial.uniforms.uScanY.value = 10 // offscreen
      }

      // Final fade - reduce particle brightness
      if (elapsed > 5.5) {
        const fadeProgress = Math.min(1, (elapsed - 5.5) / 1.0)
        eyeMaterial.uniforms.uBrightness.value = 1.0 - fadeProgress
        dustMaterial.opacity = 0.3 * (1.0 - fadeProgress)
      }

      // Dust drift
      const dustPos = dustGeometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < dustCount; i++) {
        dustPos.array[i * 3 + 1] -= 0.002 // slow downward drift
        // Wrap around
        if (dustPos.array[i * 3 + 1] < -5) {
          dustPos.array[i * 3 + 1] = 5
        }
      }
      dustPos.needsUpdate = true

      // Subtle camera breathing
      camera.position.z = 6 + Math.sin(elapsed * 0.5) * 0.1

      renderer.render(scene, camera)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    // Handle resize
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      isRunning = false
      cancelAnimationFrame(animFrameRef.current)
      tl.kill()
      window.removeEventListener('resize', handleResize)

      eyeGeometry.dispose()
      eyeMaterial.dispose()
      dustGeometry.dispose()
      dustMaterial.dispose()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [onComplete])

  // Skip on click
  const handleSkip = () => {
    if (timelineRef.current) {
      timelineRef.current.kill()
    }
    if (rendererRef.current) {
      rendererRef.current.dispose()
      rendererRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
    onComplete()
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 cursor-pointer"
      style={{ backgroundColor: '#0d1117' }}
      onClick={handleSkip}
    >
      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Matrix Rain Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {matrixColumns.map((col, i) => (
          <div
            key={i}
            className="matrix-col absolute top-0 flex flex-col items-center"
            style={{
              left: `${col.x}%`,
              opacity: 0,
              transform: `translateY(-${col.chars.length * col.fontSize * 1.5}px)`,
            }}
          >
            {col.chars.map((char, j) => (
              <span
                key={j}
                className="font-mono block whitespace-nowrap"
                style={{
                  color: 'var(--accent, #00ffcc)',
                  fontSize: `${col.fontSize}px`,
                  opacity: col.opacity * (1 - j / col.chars.length * 0.6),
                  lineHeight: '1.6',
                  textShadow: `0 0 8px var(--accent-border, rgba(0,255,204,0.3))`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* YOLO Bounding Boxes Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {BBOX_DATA.map((box, i) => (
          <div
            key={i}
            className={`bbox-container absolute`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.w}%`,
              height: `${box.h}%`,
              opacity: 0,
            }}
          >
            {/* Box border */}
            <div
              className="absolute inset-0"
              style={{
                border: '1px solid var(--accent, #00ffcc)',
                boxShadow: '0 0 8px var(--accent-muted, rgba(0,255,204,0.12)), inset 0 0 8px var(--accent-muted, rgba(0,255,204,0.05))',
              }}
            >
              {/* Corner markers */}
              {/* Top-left */}
              <div className="absolute -top-px -left-px w-3 h-3" style={{ borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
              {/* Top-right */}
              <div className="absolute -top-px -right-px w-3 h-3" style={{ borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
              {/* Bottom-left */}
              <div className="absolute -bottom-px -left-px w-3 h-3" style={{ borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
              {/* Bottom-right */}
              <div className="absolute -bottom-px -right-px w-3 h-3" style={{ borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
            </div>

            {/* Label */}
            <div
              className="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5"
              style={{
                backgroundColor: 'var(--accent-muted, rgba(0,255,204,0.15))',
                border: '1px solid var(--accent-border, rgba(0,255,204,0.3))',
                borderRadius: '2px',
              }}
            >
              <span
                className="text-xs font-mono font-bold uppercase"
                style={{ color: 'var(--accent, #00ffcc)', fontSize: '10px' }}
              >
                {box.label}
              </span>
              <span
                className={`bbox-conf-${i} text-xs font-mono`}
                style={{ color: 'var(--accent, #00ffcc)', fontSize: '10px', opacity: 0.8 }}
              >
                0
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: 'var(--accent, #00ffcc)', fontSize: '10px', opacity: 0.8 }}
              >
                %
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Title Overlay */}
      <div className="absolute bottom-[14%] w-full text-center pointer-events-none">
        <div className="mb-2" style={{ perspective: '600px' }}>
          {titleText.split('').map((char, i) => (
            <span
              key={i}
              className="intro-letter inline-block font-heading font-bold tracking-[0.15em] glow-text"
              style={{
                color: 'var(--accent, #00ffcc)',
                fontSize: 'clamp(1.2rem, 4vw, 2.5rem)',
                minWidth: char === ' ' ? '0.4em' : undefined,
                transformStyle: 'preserve-3d',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
        <p
          className="intro-subtitle font-mono uppercase tracking-[0.5em] opacity-0"
          style={{
            color: 'var(--accent, #00ffcc)',
            fontSize: 'clamp(0.55rem, 1.2vw, 0.75rem)',
            opacity: 0,
          }}
        >
          Advanced Object Detection System
        </p>
      </div>

      {/* Skip hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-gray-700 uppercase tracking-wider pointer-events-none">
        Click anywhere to skip
      </p>
    </div>
  )
}

export default IntroAnimation
