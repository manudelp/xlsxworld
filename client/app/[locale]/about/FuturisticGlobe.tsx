"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const CITIES: [number, number][] = [
  [40.7, -74.0], [51.5, -0.1], [35.7, 139.7], [-33.9, 151.2],
  [1.3, 103.8], [-23.5, -46.6], [48.9, 2.35], [55.75, 37.6],
  [19.4, -99.1], [28.6, 77.2], [-1.3, 36.8], [37.8, -122.4],
  [25.2, 55.3], [22.3, 114.2], [-34.6, -58.4],
];

function ArcLine({ from, to, speed, color }: { from: THREE.Vector3; to: THREE.Vector3; speed: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(Math.random());

  const { geometry, material } = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    mid.normalize().multiplyScalar(1.52 + dist * 0.35);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(curve, 44, 0.006, 4, false);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying float vArc;
        void main() {
          vArc = uv.x;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying float vArc;
        void main() {
          float trail = smoothstep(uProgress - 0.3, uProgress, vArc) *
                        (1.0 - smoothstep(uProgress, uProgress + 0.015, vArc));
          if (trail < 0.01) discard;
          gl_FragColor = vec4(uColor, trail);
        }
      `,
    });
    return { geometry: geo, material: mat };
  }, [from, to, color]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    progressRef.current += delta * speed;
    if (progressRef.current > 1.3) progressRef.current = -0.3;
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uProgress.value = progressRef.current;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

function Arcs({ color }: { color: string }) {
  const arcs = useMemo(() => {
    const result: { from: THREE.Vector3; to: THREE.Vector3; speed: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.floor(Math.random() * CITIES.length);
      let b = Math.floor(Math.random() * CITIES.length);
      while (b === a) b = Math.floor(Math.random() * CITIES.length);
      result.push({
        from: latLngToVec3(CITIES[a][0], CITIES[a][1], 1.505),
        to: latLngToVec3(CITIES[b][0], CITIES[b][1], 1.505),
        speed: 0.12 + Math.random() * 0.18,
      });
    }
    return result;
  }, []);

  return (
    <>
      {arcs.map((arc, i) => (
        <ArcLine key={i} from={arc.from} to={arc.to} speed={arc.speed} color={color} />
      ))}
    </>
  );
}

function CityDots({ color }: { color: string }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(CITIES.length * 3);
    CITIES.forEach(([lat, lng], i) => {
      const v = latLngToVec3(lat, lng, 1.51);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    });
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function Earth({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);
  const darkTexture = useLoader(THREE.TextureLoader, "/assets/img/earth-dark.jpg");
  const lightTexture = useLoader(THREE.TextureLoader, "/assets/img/earth-dark.jpg");

  const texture = isDark ? darkTexture : lightTexture;
  const arcColor = isDark ? "#4ade80" : "#16a34a";
  const dotColor = isDark ? "#4ade80" : "#15803d";

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
      if (scaleRef.current < 1) {
        scaleRef.current = Math.min(1, scaleRef.current + delta * 0.6);
        const t = scaleRef.current;
        // Elastic ease-out: fast grow, overshoot, settle
        const p = 0.4;
        const eased = t <= 0 ? 0 : Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        groupRef.current.scale.setScalar(eased);
      }
    }
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, 0.1]} scale={0}>
      <Sphere args={[1.5, 64, 64]}>
        {isDark ? (
          <meshStandardMaterial
            map={texture}
            color="#88dda0"
            emissive="#0a3d1a"
            emissiveIntensity={0.4}
            roughness={0.9}
            metalness={0.1}
          />
        ) : (
          <meshBasicMaterial color="#5f9d33" wireframe transparent opacity={0.3} />
        )}
      </Sphere>

      {/* Solid inner sphere for light mode depth */}
      {!isDark && (
        <Sphere args={[1.48, 64, 64]}>
          <meshBasicMaterial color="#5f9d33" transparent opacity={0.06} />
        </Sphere>
      )}

      {/* Atmosphere */}
      <Sphere args={[1.56, 64, 64]}>
        <meshBasicMaterial
          color={isDark ? "#22c55e" : "#16a34a"}
          transparent
          opacity={isDark ? 0.06 : 0.04}
          side={THREE.BackSide}
        />
      </Sphere>

      <CityDots color={dotColor} />
      <Arcs color={arcColor} />
    </group>
  );
}

function useIsDark() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function FuturisticGlobe() {
  const isDark = useIsDark();

  return (
    <div className="h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 45 }}>
        <ambientLight intensity={isDark ? 0.6 : 1.5} />
        <directionalLight position={[5, 3, 5]} intensity={isDark ? 0.8 : 1.8} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color={isDark ? "#22c55e" : "#16a34a"} />
        <Earth isDark={isDark} />
      </Canvas>
    </div>
  );
}
