import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type ChaseInput = { lane: number; jump: number };

type Props = {
  lvl: number;
  qi: number;
  locked: number[];
  active: boolean;
  input: React.RefObject<ChaseInput>;
  onDoor: (i: number) => void;
  onHit: (why: string) => void;
  onBone: () => void;
};

const LANES = [-2.4, 0, 2.4];
const RUNNER_X = -4.2;
const WORLD_SPEED = 10.5;
const GRAVITY = -28;
const JUMP_SPEED = 11;

export function EscapaChase(props: Props) {
  return (
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 6.2, 13], fov: 52 }}>
      <color attach="background" args={["#b9e3ef"]} />
      <fog attach="fog" args={["#b9e3ef", 22, 52]} />
      <hemisphereLight args={["#fff8df", "#708269", 1.15]} />
      <directionalLight position={[-4, 12, 8]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Environment resolution={64}>
        <Lightformer intensity={2.2} position={[0, 8, 2]} scale={[18, 10, 1]} />
        <Lightformer intensity={1.2} color="#ffd09b" position={[8, 3, -5]} rotation-y={Math.PI / 2} scale={[14, 3, 1]} />
      </Environment>
      <ChaseWorld {...props} />
    </Canvas>
  );
}

function ChaseWorld({ lvl, qi, locked, active, input, onDoor, onHit, onBone }: Props) {
  const ted = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Mesh | null)[]>([]);
  const moving = useRef<THREE.Group>(null);
  const gate = useRef<THREE.Group>(null);
  const obstacleRefs = useRef<(THREE.Group | null)[]>([]);
  const boneRef = useRef<THREE.Group>(null);
  const state = useRef({ lane: 1, z: 0, y: 0, vy: 0, seenJump: input.current.jump, worldX: 0, hit: false, bone: false, gate: false, t: 0 });
  const latest = useRef({ active, onDoor, onHit, onBone });
  latest.current = { active, onDoor, onHit, onBone };

  const obstacleSpecs = useMemo(() => [
    { x: 2.5, lane: (qi + lvl) % 3 },
    { x: 8.2, lane: (qi + lvl + 2) % 3 },
  ], [lvl, qi]);

  useEffect(() => {
    const s = state.current;
    s.lane = 1;
    s.z = 0;
    s.y = 0;
    s.vy = 0;
    s.worldX = 0;
    s.hit = false;
    s.bone = false;
    s.gate = false;
  }, [qi, locked]);

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = state.current;
    const L = latest.current;
    s.t += dt;

    if (L.active) {
      const requestedLane = input.current.lane;
      if (requestedLane !== 0) {
        s.lane = THREE.MathUtils.clamp(s.lane + requestedLane, 0, 2);
        input.current.lane = 0;
      }
      if (input.current.jump !== s.seenJump) {
        s.seenJump = input.current.jump;
        if (s.y <= 0.02) s.vy = JUMP_SPEED;
      }
      s.vy += GRAVITY * dt;
      s.y = Math.max(0, s.y + s.vy * dt);
      if (s.y === 0) s.vy = 0;
      s.worldX -= (WORLD_SPEED + lvl * 1.2) * dt;
    }

    s.z += (LANES[s.lane]! - s.z) * (1 - Math.exp(-12 * dt));
    if (ted.current) ted.current.position.set(RUNNER_X, s.y, s.z);
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(s.t * 19)) * 0.12 * (L.active ? 1 : 0);
      body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z, -s.vy * 0.018, 1 - Math.exp(-8 * dt));
    }
    legRefs.current.forEach((leg, i) => {
      if (leg) leg.rotation.z = Math.sin(s.t * 19 + (i % 2 ? Math.PI : 0)) * 0.65 * (L.active && s.y < 0.1 ? 1 : 0);
    });

    if (moving.current) moving.current.position.x = s.worldX;
    obstacleSpecs.forEach((spec, i) => {
      const obstacleX = spec.x + s.worldX;
      if (!s.hit && L.active && Math.abs(obstacleX - RUNNER_X) < 0.65 && Math.abs(s.z - LANES[spec.lane]!) < 0.8 && s.y < 0.85) {
        s.hit = true;
        L.onHit("Crate collision!");
      }
      const ref = obstacleRefs.current[i];
      if (ref) ref.rotation.y = Math.sin(s.t * 2 + i) * 0.035;
    });

    const boneX = 5.5 + s.worldX;
    if (boneRef.current) {
      boneRef.current.rotation.y += dt * 4;
      boneRef.current.position.y = 1.05 + Math.sin(s.t * 5) * 0.14;
    }
    if (!s.bone && L.active && Math.abs(boneX - RUNNER_X) < 0.75 && Math.abs(s.z - LANES[1]!) < 0.85 && s.y > 0.35) {
      s.bone = true;
      if (boneRef.current) boneRef.current.visible = false;
      L.onBone();
    }

    const gateX = 14 + s.worldX;
    if (!s.gate && L.active && gateX <= RUNNER_X + 0.25) {
      s.gate = true;
      L.onDoor(s.lane);
    }
    if (gate.current) gate.current.position.x = gateX;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, -0.2, 1 - Math.exp(-4 * dt));
    camera.lookAt(-0.4, 1.2, 0);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov += ((L.active ? 58 : 52) - perspective.fov) * (1 - Math.exp(-3 * dt));
    perspective.updateProjectionMatrix();
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 18]} />
        <meshStandardMaterial color="#82996d" roughness={0.95} />
      </mesh>
      {LANES.map((z) => (
        <mesh key={z} position={[0, 0.025, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[70, 1.85]} />
          <meshStandardMaterial color="#c6b08d" roughness={0.95} />
        </mesh>
      ))}
      <group ref={moving}>
        {[-2, 7, 16, 25].map((x, i) => (
          <group key={x} position={[x, 0, -6.8]}>
            <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.28, 0.38, 2.4, 8]} /><meshStandardMaterial color="#795235" /></mesh>
            <mesh position={[0, 3.1, 0]} scale={[1.6, 1.15, 1.1]} castShadow><sphereGeometry args={[1.4, 9, 7]} /><meshStandardMaterial color={i % 2 ? "#5f8654" : "#6f945e"} flatShading /></mesh>
          </group>
        ))}
        {obstacleSpecs.map((o, i) => (
          <group key={i} ref={(r) => { obstacleRefs.current[i] = r; }} position={[o.x, 0, LANES[o.lane] ?? 0]}>
            <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[1.25, 1.3, 1.35]} /><meshStandardMaterial color="#a86f3d" roughness={0.8} /></mesh>
            <mesh position={[0, 0.65, 0.7]}><boxGeometry args={[1.32, 0.12, 0.08]} /><meshStandardMaterial color="#6d4529" /></mesh>
          </group>
        ))}
        <group ref={boneRef} position={[5.5, 1.05, LANES[1]]}>
          <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 0.72, 8]} /><meshStandardMaterial color="#fff8dd" /></mesh>
          {[-0.36, 0.36].flatMap((x) => [-0.1, 0.1].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 0]}><sphereGeometry args={[0.13, 9, 7]} /><meshStandardMaterial color="#fff8dd" /></mesh>))}
        </group>
      </group>

      <group ref={gate} position={[14, 0, 0]}>
        {LANES.map((z, i) => {
          const barred = locked.includes(i);
          return (
            <group key={z} position={[0, 0, z]}>
              <mesh position={[0, 1.45, -0.9]} castShadow><boxGeometry args={[0.65, 2.9, 0.35]} /><meshStandardMaterial color={barred ? "#aa3d35" : "#e97b31"} /></mesh>
              <mesh position={[0, 1.45, 0.9]} castShadow><boxGeometry args={[0.65, 2.9, 0.35]} /><meshStandardMaterial color={barred ? "#aa3d35" : "#e97b31"} /></mesh>
              <mesh position={[0, 3, 0]} castShadow><boxGeometry args={[0.65, 0.35, 2.15]} /><meshStandardMaterial color={barred ? "#aa3d35" : "#e97b31"} /></mesh>
              {barred && [-0.55, 0, 0.55].map((bz) => <mesh key={bz} position={[-0.35, 1.45, bz]}><cylinderGeometry args={[0.06, 0.06, 2.6, 8]} /><meshStandardMaterial color="#34302f" metalness={0.7} /></mesh>)}
            </group>
          );
        })}
      </group>

      <group ref={ted} position={[RUNNER_X, 0, 0]} rotation-y={-Math.PI / 2}>
        <group ref={body}>
          <ChaseTed legs={legRefs} />
        </group>
      </group>
    </>
  );
}

function ChaseTed({ legs }: { legs: React.RefObject<(THREE.Mesh | null)[]> }) {
  return (
    <group scale={0.95}>
      <mesh position={[0, 0.68, 0]} scale={[0.56, 0.5, 0.76]} castShadow><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial color="#c98a4b" roughness={0.95} /></mesh>
      <mesh position={[0, 1.12, -0.67]} castShadow><sphereGeometry args={[0.39, 18, 14]} /><meshStandardMaterial color="#d49a5c" roughness={0.95} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * 0.35, 1.02, -0.58]} rotation-z={side * 0.25} scale={[0.14, 0.34, 0.22]}><sphereGeometry args={[1, 11, 8]} /><meshStandardMaterial color="#a86a30" /></mesh>)}
      <mesh position={[0, 1.03, -1.05]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.18, 12, 9]} /><meshStandardMaterial color="#e7bc8a" /></mesh>
      <mesh position={[0, 1.08, -1.21]}><sphereGeometry args={[0.065, 9, 7]} /><meshStandardMaterial color="#2b1a0e" /></mesh>
      {[-0.14, 0.14].map((x) => <mesh key={x} position={[x, 1.2, -1.03]}><sphereGeometry args={[0.052, 9, 7]} /><meshStandardMaterial color="#2b1a0e" /></mesh>)}
      <mesh position={[0, 0.9, 0.73]}><sphereGeometry args={[0.17, 11, 8]} /><meshStandardMaterial color="#c98a4b" /></mesh>
      {[[-0.27, -0.38], [0.27, -0.38], [-0.27, 0.38], [0.27, 0.38]].map(([x, z], i) => (
        <mesh key={i} ref={(m) => { legs.current[i] = m; }} position={[x, 0.31, z]} castShadow>
          <cylinderGeometry args={[0.105, 0.115, 0.46, 9]} /><meshStandardMaterial color="#a86a30" />
        </mesh>
      ))}
    </group>
  );
}