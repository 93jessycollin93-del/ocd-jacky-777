import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSphere } from '../SphereContext';
import type { Planet } from '../types';

function PlanetMesh({ planet, isSelected, onClick }: { planet: Planet; isSelected: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
    if (glowRef.current && isSelected) {
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
    }
  });

  const ownerColor = planet.owner === 'player' ? '#4ade80' : planet.owner === 'enemy' ? '#ef4444' : '#94a3b8';

  return (
    <group position={planet.position}>
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[planet.radius * 1.4, 16, 16]} />
          <meshBasicMaterial color="#4f46e5" transparent opacity={0.15} />
        </mesh>
      )}
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[planet.radius, 32, 32]} />
        <meshStandardMaterial color={planet.color} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Owner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.radius * 1.2, planet.radius * 1.3, 32]} />
        <meshBasicMaterial color={ownerColor} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Label */}
      <Html position={[0, planet.radius + 0.5, 0]} center distanceFactor={15}>
        <div className="text-xs font-mono whitespace-nowrap px-1.5 py-0.5 rounded bg-background/80 border border-border text-foreground pointer-events-none select-none">
          {planet.name}
        </div>
      </Html>
    </group>
  );
}

function FleetMarker({ position, name }: { position: [number, number, number]; name: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 2;
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, 0.6, 0]} center distanceFactor={15}>
        <div className="text-[10px] font-mono px-1 py-0.5 rounded bg-primary/80 text-primary-foreground whitespace-nowrap pointer-events-none select-none">
          {name}
        </div>
      </Html>
    </group>
  );
}

function SunCore() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#fbbf24" />
      <pointLight intensity={2} distance={100} color="#fbbf24" />
    </mesh>
  );
}

export default function GalaxyView() {
  const { state, selectPlanet } = useSphere();

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 30, 40], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <Stars radius={200} depth={60} count={3000} factor={4} />
        <SunCore />
        {state.planets.map(planet => (
          <PlanetMesh
            key={planet.id}
            planet={planet}
            isSelected={state.selectedPlanet === planet.id}
            onClick={() => selectPlanet(planet.id)}
          />
        ))}
        {state.fleets.map(fleet => (
          <FleetMarker key={fleet.id} position={fleet.position} name={fleet.name} />
        ))}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={10}
          maxDistance={80}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
