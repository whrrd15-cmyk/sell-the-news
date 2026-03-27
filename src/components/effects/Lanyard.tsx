'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Physics, RigidBody, BallCollider, CuboidCollider, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'

extend({ MeshLineGeometry, MeshLineMaterial })

interface LanyardProps {
  position?: [number, number, number]
  gravity?: [number, number, number]
  fov?: number
  transparent?: boolean
  playerName?: string
}

export function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  playerName = '투자 전문가',
}: LanyardProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position, fov }}
        frameloop="always"
        gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
        style={{ background: 'transparent' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0)
          scene.background = null
        }}
      >
        <ambientLight intensity={0.8} />
        <Physics gravity={gravity} timeStep={1 / 60}>
          <Band maxSpeed={50} minSpeed={0} playerName={playerName} />
        </Physics>
        <Environment blur={0.75} background={false}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  )
}

function Band({ maxSpeed = 50, minSpeed = 0, playerName = '' }: { maxSpeed?: number; minSpeed?: number; playerName?: string }) {
  const bandRef = useRef<THREE.Mesh>(null!)
  const fixed = useRef<any>(null!)
  const j1 = useRef<any>(null!)
  const j2 = useRef<any>(null!)
  const j3 = useRef<any>(null!)
  const card = useRef<any>(null!)
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false)
  const [hovered, setHovered] = useState(false)
  const segmentProps = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 }

  const cardTexture = useMemo(() => {
    const W = 512, H = 320
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // 배경
    ctx.fillStyle = '#111119'
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 16)
    ctx.fill()

    // 테두리
    ctx.strokeStyle = '#f0b42940'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(6, 6, W - 12, H - 12, 12)
    ctx.stroke()

    ctx.textAlign = 'center'

    // 회사명
    ctx.fillStyle = '#f0b429'
    ctx.font = '500 16px system-ui, sans-serif'
    ctx.fillText('STOCK ROGUELIKE', W / 2, 42)

    // 구분선
    ctx.strokeStyle = '#ffffff12'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(120, 58)
    ctx.lineTo(W - 120, 58)
    ctx.stroke()

    // 정규직
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 48px system-ui, sans-serif'
    ctx.fillText('정규직', W / 2, 130)

    // FULL-TIME
    ctx.fillStyle = '#5ec269'
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.fillText('FULL-TIME EMPLOYEE', W / 2, 160)

    // 구분선
    ctx.beginPath()
    ctx.moveTo(150, 180)
    ctx.lineTo(W - 150, 180)
    ctx.stroke()

    // 이름
    ctx.fillStyle = '#c4a0ff'
    ctx.font = '500 22px system-ui, sans-serif'
    ctx.fillText(playerName, W / 2, 218)

    // 부서
    ctx.fillStyle = '#555566'
    ctx.font = '400 13px system-ui, sans-serif'
    ctx.fillText('투자운용부', W / 2, 252)

    // ID
    ctx.fillStyle = '#333344'
    ctx.font = '400 11px monospace'
    ctx.fillText('SR-2026-001', W / 2, 280)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [playerName])

  // Rope joints
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => { document.body.style.cursor = 'auto' }
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({
        x: vec.x - (dragged as THREE.Vector3).x,
        y: vec.y - (dragged as THREE.Vector3).y,
        z: vec.z - (dragged as THREE.Vector3).z,
      })
    }

    if (fixed.current) {
      ;[j1, j2].forEach((ref) => {
        if (!ref.current) return
        const clampedSpeed = Math.max(minSpeed, Math.min(maxSpeed, vel(ref.current)))
        ref.current.setAngvel({ x: clampedSpeed, y: 0, z: 0 })
      })

      const curvePoints = [fixed, j1, j2, j3, card].map((ref) => {
        if (!ref.current) return new THREE.Vector3()
        const pos = ref.current.translation()
        return new THREE.Vector3(pos.x, pos.y, pos.z)
      })

      const curve = new THREE.CatmullRomCurve3(curvePoints)
      const points = curve.getPoints(32)

      if (bandRef.current) {
        ;(bandRef.current.geometry as any).setPoints(points.map(p => [p.x, p.y, p.z]).flat())
      }

      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0, -1, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, -2, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, -3, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[0, -4, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <mesh
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e) => {
              ;(e.target as any).releasePointerCapture(e.pointerId)
              setDragged(false)
            }}
            onPointerDown={(e) => {
              ;(e.target as any).setPointerCapture(e.pointerId)
              const pos = card.current.translation()
              setDragged(new THREE.Vector3(
                e.point.x - pos.x,
                e.point.y - pos.y,
                e.point.z - pos.z,
              ))
            }}
          >
            <boxGeometry args={[1.6, 2.25, 0.04]} />
            <meshStandardMaterial
              map={cardTexture}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        </RigidBody>
      </group>

      {/* Lanyard band */}
      <mesh ref={bandRef}>
        {/* @ts-ignore */}
        <meshLineGeometry />
        {/* @ts-ignore */}
        <meshLineMaterial
          color="#f0b429"
          opacity={1}
          lineWidth={1}
          resolution={[window.innerWidth, window.innerHeight]}
        />
      </mesh>
    </>
  )
}

function vel(body: any) {
  const v = body.linvel()
  return Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z)
}
