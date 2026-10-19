import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ─────────────────────────  particle field  ───────────────────────── */

function ParticleField({ count = 2600 }: { count?: number }) {
  const points = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#22d3ee'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#34d399'),
    ]
    for (let i = 0; i < count; i += 1) {
      const r = 5.5 + Math.random() * 6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.65
      positions[i * 3 + 2] = r * Math.cos(phi)
      const c = palette[i % palette.length]!
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [count])

  useFrame((state) => {
    if (!points.current) return
    points.current.rotation.y = state.clock.elapsedTime * 0.045
    points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.13) * 0.12
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ─────────────────────────  wireframe core  ───────────────────────── */

function WireCore() {
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Mesh>(null)
  const { pointer } = useThree()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y += delta * 0.18
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.25, 0.05)
      group.current.position.y = Math.sin(t * 0.6) * 0.12
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.32
      inner.current.rotation.z += delta * 0.08
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[2.15, 1]} />
        <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.32} />
      </mesh>
      <mesh ref={inner} scale={0.62}>
        <icosahedronGeometry args={[2.15, 0]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh scale={1.35}>
        <sphereGeometry args={[2.15, 24, 24]} />
        <meshBasicMaterial color="#4338ca" transparent opacity={0.06} />
      </mesh>
    </group>
  )
}

/* ─────────────────────────  floating rings  ───────────────────────── */

function Rings() {
  const group = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.z += delta * 0.06
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.35
  })
  return (
    <group ref={group}>
      {[3.1, 3.7, 4.4].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * 0.22, i * 0.5, 0]}>
          <torusGeometry args={[r, 0.006 + i * 0.002, 8, 128]} />
          <meshBasicMaterial color={i % 2 ? '#34d399' : '#f472b6'} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────────  parallax rig  ───────────────────────── */

function ParallaxRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const { camera } = useThree()
  useFrame((state) => {
    if (!group.current) return
    const targetX = state.pointer.x * 0.35
    const targetY = state.pointer.y * 0.25
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, 0.03)
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.03)
    camera.position.z = 8 + Math.sin(state.clock.elapsedTime * 0.25) * 0.25
    camera.lookAt(0, 0, 0)
  })
  return <group ref={group}>{children}</group>
}

/* ─────────────────────────  public scene  ───────────────────────── */

export default function HeroScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 8], fov: 46 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ParallaxRig>
            <WireCore />
            <Rings />
            <ParticleField />
          </ParallaxRig>
        </Suspense>
      </Canvas>
    </div>
  )
}

/** Lighter variant for auth / section backdrops. */
export function MiniScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <WireCore />
          <ParticleField count={900} />
        </Suspense>
      </Canvas>
    </div>
  )
}
