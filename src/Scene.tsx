import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, Component, type ReactNode } from "react";
import * as THREE from "three";
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    console.info("3D演出を停止しました。計測は継続します。");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Effects({ mode }: { mode: string }) {
  const drone = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);
  const rings = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const p = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) {
      p[i * 3] = (Math.random() - 0.5) * 18;
      p[i * 3 + 1] = (Math.random() - 0.5) * 9;
      p[i * 3 + 2] = -Math.random() * 12;
    }
    return p;
  }, []);
  const gold = mode === "victory";
  const color = gold
    ? "#ffd24a"
    : mode === "silver"
      ? "#dceaff"
      : mode === "bronze"
        ? "#e8a975"
        : "#79efff";
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    if (drone.current) {
      drone.current.position.x = Math.sin(t * 0.3) * 3.5;
      drone.current.position.y = 1.8 + Math.sin(t) * 0.2;
      drone.current.position.z = THREE.MathUtils.lerp(
        drone.current.position.z,
        mode === "launch" ? -8 : 0,
        Math.min(dt * 5, 1),
      );
      drone.current.rotation.z = Math.sin(t * 0.7) * 0.12;
    }
    if (particles.current)
      particles.current.rotation.y += Math.min(dt, 0.05) * 0.04;
    if (rings.current) rings.current.rotation.z = Math.sin(t * 0.3) * 0.08;
    camera.position.x = Math.sin(t * 0.15) * 0.2;
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      mode === "launch" ? 6 : gold ? 6.6 : 7,
      Math.min(dt * 2, 1),
    );
  });
  return (
    <>
      {mode === "launch" &&
        [-5, -3, -1, 1, 3, 5].map((x) => (
          <mesh key={x} position={[x, -1, -4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 7, 6]} />
            <meshBasicMaterial color="#b8f6ff" transparent opacity={0.5} />
          </mesh>
        ))}
      <ambientLight intensity={1.4} />
      <pointLight
        position={[0, 4, 4]}
        intensity={25}
        color={gold ? "#ffd96b" : "#42dfff"}
      />
      <group ref={drone} position={[0, 2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.12, 0.4]} />
          <meshStandardMaterial
            color="#99dfff"
            metalness={0.6}
            roughness={0.25}
          />
        </mesh>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={`${x}${z}`} position={[x * 0.42, 0, z * 0.35]}>
              <mesh>
                <cylinderGeometry args={[0.23, 0.23, 0.025, 16]} />
                <meshBasicMaterial color="#3de5ff" wireframe />
              </mesh>
              <mesh position={[0, -0.05, 0]}>
                <sphereGeometry args={[0.065, 8, 8]} />
                <meshBasicMaterial color="white" />
              </mesh>
            </group>
          )),
        )}
      </group>
      <group ref={rings}>
        {[-4, 4].map((x) => (
          <mesh key={x} position={[x, 0, -2]}>
            <torusGeometry args={[1.5, 0.025, 8, 48]} />
            <meshBasicMaterial
              color={
                mode === "launch" ? "#ffffc8" : gold ? "#ffda55" : "#20d5ff"
              }
            />
          </mesh>
        ))}
      </group>
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={gold ? 0.065 : 0.035}
          color={color}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </points>
      {gold &&
        [-5, 5].map((x) => (
          <mesh key={x} position={[x, 0, -3]}>
            <cylinderGeometry args={[0.03, 0.25, 8, 12]} />
            <meshBasicMaterial color="#ffe180" transparent opacity={0.25} />
          </mesh>
        ))}
    </>
  );
}
export default function Scene({ mode }: { mode: string }) {
  const supported = useMemo(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  }, []);
  if (!supported) return null;
  return (
    <SceneBoundary>
      <div className="scene" aria-hidden="true">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 7], fov: 52 }}
          gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              gl.domElement.style.display = "none";
            });
          }}
        >
          <Effects mode={mode} />
        </Canvas>
      </div>
    </SceneBoundary>
  );
}
