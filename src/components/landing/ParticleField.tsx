"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Points as ThreePoints } from "three";

const COUNT = 1200;
const SPREAD = 32;

function inSphere(out: Float32Array, radius: number) {
  for (let i = 0; i < out.length; i += 3) {
    const u = Math.random() * 2 - 1;
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    out[i] = r * Math.sin(phi) * Math.cos(theta);
    out[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    out[i + 2] = r * Math.cos(phi);
  }
  return out;
}

function ParticleFieldInner({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const ref = useRef<ThreePoints>(null);
  const positions = useMemo(() => inSphere(new Float32Array(COUNT * 3), SPREAD), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.05;
    ref.current.rotation.set(t * 0.05, t * 0.03, 0);
    const pos = ref.current.position;
    pos.x = mouse.current.x * 0.8;
    pos.y = mouse.current.y * 0.8;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        transparent
        size={0.04}
        sizeAttenuation
        depthWrite={false}
        color="#6366f1"
        opacity={0.35}
      />
    </points>
  );
}

export default function ParticleField() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }} dpr={[1, 1.5]}>
        <ParticleFieldInner mouse={mouse} />
      </Canvas>
    </div>
  );
}
