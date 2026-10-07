import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DOOR_X, HALF_W, ROOM_LEN, START_Z, blocked, makeRoom, type Room3D } from "@/lib/escapa3d";

export type Stick = { x: number; y: number };
type Props = {
  lvl: number; qi: number; options: string[]; locked: number[]; active: boolean;
  input: React.RefObject<Stick>;
  onDoor: (i: number) => void; onHit: (why: string) => void; onBone: () => void;
};

const TED_SPEED = 5.5;
const CAM_OFFSET = new THREE.Vector3(0, 6.5, 8.5);
const _cam = new THREE.Vector3();
const _look = new THREE.Vector3();
const yawTo = (vx: number, vz: number) => Math.atan2(-vx, -vz);
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export function EscapaScene(p: Props) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 6.5, 10.5], fov: 58 }}>
      <color attach="background" args={["#f3e6d3"]} />
      <fog attach="fog" args={["#f3e6d3", 22, 48]} />
      <hemisphereLight args={["#fff4e0", "#8a7a66", 0.9]} />
      <directionalLight position={[6, 14, 6]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1} color="#ffd9a8" position={[-6, 2, -6]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <World key={`${p.lvl}-${p.qi}`} {...p} />
    </Canvas>
  );
}

function useFloorTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#cfc4b4"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},70,0.08)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    g.strokeStyle = "#b3a796"; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 20); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }, []);
}

function World({ lvl, qi, options, locked, active, input, onDoor, onHit, onBone }: Props) {
  const room: Room3D = useMemo(() => makeRoom(lvl, qi), [lvl, qi]);
  const floor = useFloorTexture();
  const ted = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const guardRefs = useRef<(THREE.Group | null)[]>([]);
  const coneRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const laserRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const boneRefs = useRef<(THREE.Group | null)[]>([]);
  const g = useRef(room.guards.map((s) => ({ x: s.x, z: s.z, dir: s.x < 0 ? 1 : -1, chase: 0, heading: 0 })));
  const st = useRef({ x: 0, z: START_Z, yaw: 0, inv: 0, t: 0, got: new Set<number>() });
  const keys = useRef(new Set<string>());
  const latest = useRef({ locked, onDoor, onHit, onBone, active });
  latest.current = { locked, onDoor, onHit, onBone, active };

  useLayoutEffect(() => {
    const d = (e: KeyboardEvent) => keys.current.add(e.code);
    const u = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  const resetAll = () => {
    Object.assign(st.current, { x: 0, z: START_Z, yaw: 0 });
    g.current = room.guards.map((s) => ({ x: s.x, z: s.z, dir: s.x < 0 ? 1 : -1, chase: 0, heading: 0 }));
  };

  useFrame(({ camera }, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = st.current, L = latest.current;
    s.t += dt; s.inv = Math.max(0, s.inv - dt);
    let mx = 0, mz = 0;
    if (L.active) {
      const k = keys.current, i = input.current;
      mx = i.x + ((k.has("ArrowRight") || k.has("KeyD") ? 1 : 0) - (k.has("ArrowLeft") || k.has("KeyA") ? 1 : 0));
      mz = i.y + ((k.has("ArrowDown") || k.has("KeyS") ? 1 : 0) - (k.has("ArrowUp") || k.has("KeyW") ? 1 : 0));
      const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    }
    const spd = Math.hypot(mx, mz);
    if (spd > 0.05) {
      const dx = mx * TED_SPEED * dt, dz = mz * TED_SPEED * dt;
      if (!blocked(s.x + dx, s.z, room.crates)) s.x += dx;
      const nz = s.z + dz;
      if (nz <= -ROOM_LEN + 0.6) {
        const di = DOOR_X.findIndex((x) => Math.abs(s.x - x) < 1.25);
        if (di >= 0 && !L.locked.includes(di)) { L.onDoor(di); resetAll(); }
      } else if (!blocked(s.x, nz, room.crates)) s.z = nz;
      s.yaw = lerpAngle(s.yaw, yawTo(mx, mz), 1 - Math.exp(-12 * dt));
    }

    // Guards: patrol, spot with torch, chase.
    if (L.active) g.current.forEach((gd, i) => {
      const spec = room.guards[i]!;
      const ddx = s.x - gd.x, ddz = s.z - gd.z, dist = Math.hypot(ddx, ddz);
      const hx = Math.sin(-gd.heading), hz = Math.cos(gd.heading) * -1;
      const seen = dist < 5.5 && (ddx * hx + ddz * hz) / (dist || 1) > 0.75;
      if (seen) gd.chase = 2.5; else gd.chase = Math.max(0, gd.chase - dt);
      let vx: number, vz: number, v = spec.speed;
      if (gd.chase > 0) { vx = ddx / (dist || 1); vz = ddz / (dist || 1); v *= 1.35; }
      else if (Math.abs(gd.z - spec.z) > 0.3) { vx = 0; vz = Math.sign(spec.z - gd.z); }
      else { if (Math.abs(gd.x) > HALF_W - 1.2) gd.dir = gd.x > 0 ? -1 : 1; vx = gd.dir; vz = 0; }
      const nx = gd.x + vx * v * dt, nz = gd.z + vz * v * dt;
      if (!blocked(nx, gd.z, room.crates, 0.5)) gd.x = nx; else gd.dir *= -1;
      if (!blocked(gd.x, nz, room.crates, 0.5) && Math.abs(nz - spec.z) < 4) gd.z = nz;
      gd.heading = lerpAngle(gd.heading, yawTo(vx, vz), 1 - Math.exp(-8 * dt));
      if (dist < 0.95 && s.inv <= 0) { s.inv = 1.5; L.onHit("Caught by the guard!"); resetAll(); }
      const ref = guardRefs.current[i];
      if (ref) { ref.position.set(gd.x, Math.abs(Math.sin(s.t * 10)) * 0.06, gd.z); ref.rotation.y = gd.heading; }
      const cone = coneRefs.current[i];
      if (cone) { cone.color.set(gd.chase > 0 ? "#ff4d3d" : "#ffe27a"); cone.opacity = gd.chase > 0 ? 0.32 : 0.2; }
    });

    // Lasers
    room.lasers.forEach((lz, i) => {
      const on = Math.sin(((s.t + lz.offset) / lz.period) * Math.PI * 2) > -0.1;
      const m = laserRefs.current[i];
      if (m) { m.opacity = on ? 0.95 : 0.12; m.emissiveIntensity = on ? 3 : 0.2; }
      if (L.active && on && Math.abs(s.z - lz.z) < 0.4 && s.inv <= 0) { s.inv = 1.5; L.onHit("Zapped by a laser!"); resetAll(); }
    });

    // Bones
    room.bones.forEach((b, i) => {
      const ref = boneRefs.current[i];
      if (!ref) return;
      if (s.got.has(i)) { ref.visible = false; return; }
      ref.rotation.y += dt * 2; ref.position.y = 0.6 + Math.sin(s.t * 3 + i) * 0.12;
      if (L.active && Math.hypot(s.x - b.x, s.z - b.z) < 0.9) { s.got.add(i); L.onBone(); }
    });

    // Ted
    if (ted.current) {
      ted.current.position.set(s.x, 0, s.z);
      ted.current.rotation.y = s.yaw;
      ted.current.visible = s.inv <= 0 || Math.floor(s.t * 12) % 2 === 0;
    }
    const run = Math.min(1, spd);
    if (body.current) body.current.position.y = Math.abs(Math.sin(s.t * 14)) * 0.12 * run;
    legs.current.forEach((l, i) => { if (l) l.rotation.x = Math.sin(s.t * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.7 * run; });

    _cam.set(s.x * 0.6, 0, s.z).add(CAM_OFFSET);
    camera.position.lerp(_cam, 1 - Math.exp(-5 * dt));
    _look.set(s.x * 0.8, 0.6, s.z - 5);
    camera.lookAt(_look);
  });

  const wallLen = ROOM_LEN + 6;
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -ROOM_LEN / 2 + 1]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, wallLen]} />
        <meshStandardMaterial map={floor} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (HALF_W + 0.3), 1.4, -ROOM_LEN / 2 + 1]} receiveShadow castShadow>
            <boxGeometry args={[0.6, 2.8, wallLen]} />
            <meshStandardMaterial color="#e9dcc6" roughness={0.85} />
          </mesh>
          <mesh position={[side * (HALF_W - 0.02), 0.2, -ROOM_LEN / 2 + 1]}>
            <boxGeometry args={[0.08, 0.4, wallLen]} />
            <meshStandardMaterial color="#6b8f71" />
          </mesh>
        </group>
      ))}
      {/* back wall with three doorways */}
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 1.6, -ROOM_LEN - 0.3]} castShadow>
          <boxGeometry args={[x === -6 || x === 6 ? 1.6 : 1.4, 3.2, 0.6]} />
          <meshStandardMaterial color="#d8c8ae" />
        </mesh>
      ))}
      {DOOR_X.map((x, i) => {
        const isLocked = locked.includes(i);
        return (
          <group key={x} position={[x, 0, -ROOM_LEN - 0.3]}>
            <mesh position={[0, 2.95, 0]}><boxGeometry args={[2.7, 0.5, 0.7]} /><meshStandardMaterial color={isLocked ? "#b23a2e" : "#e8772e"} /></mesh>
            {isLocked && [-0.8, -0.27, 0.27, 0.8].map((b) => (
              <mesh key={b} position={[b, 1.35, 0]}><cylinderGeometry args={[0.07, 0.07, 2.7, 8]} /><meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} /></mesh>
            ))}
            {!isLocked && <mesh position={[0, 1.35, -0.2]}><planeGeometry args={[2.5, 2.7]} /><meshBasicMaterial color="#fff2c4" /></mesh>}
            <Html position={[0, 3.7, 0.4]} center zIndexRange={[10, 0]}>
              <div className={`whitespace-nowrap rounded-xl px-2.5 py-1.5 text-center text-sm font-extrabold shadow-lg ${isLocked ? "bg-destructive/80 text-destructive-foreground line-through" : "bg-card text-foreground"}`}>
                {options[i]}
              </div>
            </Html>
          </group>
        );
      })}
      {room.crates.map((c, i) => (
        <mesh key={i} position={[c.x, 0.6, c.z]} castShadow receiveShadow>
          <boxGeometry args={[c.w, 1.2, c.d]} />
          <meshStandardMaterial color={i % 2 ? "#a7744a" : "#b98455"} roughness={0.8} />
        </mesh>
      ))}
      {room.lasers.map((l, i) => (
        <group key={i} position={[0, 0, l.z]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (HALF_W - 0.2), 0.6, 0]}><cylinderGeometry args={[0.15, 0.15, 1.2, 10]} /><meshStandardMaterial color="#444" metalness={0.7} /></mesh>
          ))}
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[HALF_W * 2 - 0.4, 0.08, 0.08]} />
            <meshStandardMaterial ref={(m) => { laserRefs.current[i] = m; }} color="#ff2a2a" emissive="#ff2a2a" transparent />
          </mesh>
        </group>
      ))}
      {room.bones.map((b, i) => (
        <group key={i} position={[b.x, 0.6, b.z]} ref={(r) => { boneRefs.current[i] = r; }}>
          <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.6, 8]} /><meshStandardMaterial color="#fffaf0" /></mesh>
          {[-0.3, 0.3].flatMap((x) => [-0.08, 0.08].map((y) => (
            <mesh key={`${x}${y}`} position={[x, y, 0]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color="#fffaf0" /></mesh>
          )))}
        </group>
      ))}
      {room.guards.map((_, i) => (
        <group key={i} ref={(r) => { guardRefs.current[i] = r; }}>
          <mesh position={[0, 0.75, 0]} castShadow><capsuleGeometry args={[0.38, 0.7, 6, 12]} /><meshStandardMaterial color="#2f4a6d" /></mesh>
          <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color="#e8b98f" /></mesh>
          <mesh position={[0, 1.78, 0]}><cylinderGeometry args={[0.32, 0.34, 0.16, 16]} /><meshStandardMaterial color="#1c2b40" /></mesh>
          <mesh position={[0, 1.72, -0.28]}><boxGeometry args={[0.5, 0.05, 0.25]} /><meshStandardMaterial color="#1c2b40" /></mesh>
          {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 1.58, -0.26]}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>)}
          <mesh position={[0, 0.9, -2.75]} rotation-x={Math.PI / 2}>
            <coneGeometry args={[1.6, 5.5, 20, 1, true]} />
            <meshBasicMaterial ref={(m) => { coneRefs.current[i] = m; }} color="#ffe27a" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <group ref={ted}>
        <group ref={body}>
          <TedModel legs={legs} />
        </group>
      </group>
    </>
  );
}

const FUR = "#C98A4B", DARK = "#A86A30", LIGHT = "#E7BC8A";
function TedModel({ legs }: { legs: React.RefObject<(THREE.Mesh | null)[]> }) {
  return (
    <group scale={0.95}>
      <mesh position={[0, 0.62, 0]} scale={[0.52, 0.46, 0.7]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={FUR} roughness={0.95} /></mesh>
      <mesh position={[0, 0.48, -0.05]} scale={[0.4, 0.3, 0.55]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={LIGHT} roughness={1} /></mesh>
      <mesh position={[0, 1.08, -0.62]} castShadow><sphereGeometry args={[0.38, 20, 16]} /><meshStandardMaterial color="#D49A5C" roughness={0.95} /></mesh>
      <mesh position={[0, 1.38, -0.6]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.24, 14, 12]} /><meshStandardMaterial color={FUR} roughness={1} /></mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.36, 0.95, -0.58]} rotation-z={sd * 0.25} scale={[0.13, 0.32, 0.2]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={DARK} roughness={1} /></mesh>
      ))}
      <mesh position={[0, 0.98, -0.95]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.18, 14, 12]} /><meshStandardMaterial color={LIGHT} /></mesh>
      <mesh position={[0, 1.03, -1.12]}><sphereGeometry args={[0.065, 10, 8]} /><meshStandardMaterial color="#2B1A0E" roughness={0.3} /></mesh>
      {[-0.14, 0.14].map((x) => <mesh key={x} position={[x, 1.17, -0.94]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color="#2B1A0E" roughness={0.2} /></mesh>)}
      <mesh position={[0, 0.85, 0.68]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color={FUR} /></mesh>
      {[[-0.26, -0.35], [0.26, -0.35], [-0.26, 0.35], [0.26, 0.35]].map(([x, z], i) => (
        <mesh key={i} ref={(m) => { legs.current[i] = m; }} position={[x!, 0.32, z!]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 0.42, 10]} /><meshStandardMaterial color={DARK} />
        </mesh>
      ))}
    </group>
  );
}
