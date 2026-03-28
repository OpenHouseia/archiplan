import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FloorPlan3D, Room } from '../types';
import { RotateCcw } from 'lucide-react';

interface RoomMeshProps {
  room: Room;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const RoomMesh: React.FC<RoomMeshProps> = ({ room, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.points.length > 0) {
      s.moveTo(room.points[0][0], room.points[0][1]);
      for (let i = 1; i < room.points.length; i++) {
        s.lineTo(room.points[i][0], room.points[i][1]);
      }
      s.closePath();
    }
    return s;
  }, [room.points]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: room.height,
    bevelEnabled: false,
  }), [room.height]);

  const center = useMemo(() => {
    let x = 0, y = 0;
    room.points.forEach(p => { x += p[0]; y += p[1]; });
    return [x / room.points.length, y / room.points.length];
  }, [room.points]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh 
        position={[0, 0, 0.01]} 
        onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial 
          color={isSelected ? "#6366f1" : (hovered ? "#818cf8" : "#1e293b")} 
          side={THREE.DoubleSide} 
          roughness={0.8}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial 
          color={isSelected ? "#818cf8" : "#ffffff"} 
          opacity={isSelected ? 0.4 : 0.2} 
          transparent 
          side={THREE.DoubleSide} 
        />
      </mesh>

      <Html position={[center[0], center[1], room.height + 0.5]} center distanceFactor={10}>
        <div className={`px-2 py-1 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-white whitespace-nowrap pointer-events-none transition-all ${hovered || isSelected ? 'scale-110 opacity-100' : 'opacity-60 scale-90'}`}>
          {room.name}
        </div>
      </Html>
    </group>
  );
};

interface Viewer3DProps {
  data: FloorPlan3D | null;
  selectedRoomId: string | null;
  onRoomSelect: (id: string) => void;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ data, selectedRoomId, onRoomSelect }) => {
  return (
    <div className="w-full h-full bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-2xl group">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={45} />
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} 
          enableDamping
          dampingFactor={0.05}
        />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#6366f1" />
        
        <Environment preset="night" />
        
        <Grid 
          infiniteGrid 
          fadeDistance={40} 
          fadeStrength={5} 
          cellSize={1} 
          sectionSize={5} 
          sectionColor="#1e293b" 
          cellColor="#0f172a" 
        />
        
        <group position={[0, 0, 0]}>
          {data?.rooms.map((room) => (
            <RoomMesh 
              key={room.id} 
              room={room} 
              isSelected={selectedRoomId === room.id}
              onSelect={onRoomSelect}
            />
          ))}
          
          {data?.walls.map((wall, idx) => {
            const start = new THREE.Vector3(wall.start[0], 0, wall.start[1]);
            const end = new THREE.Vector3(wall.end[0], 0, wall.end[1]);
            const length = start.distanceTo(end);
            const center = start.clone().lerp(end, 0.5);
            const angle = Math.atan2(end.z - start.z, end.x - start.x);
            
            return (
              <mesh key={idx} position={[center.x, wall.height / 2, center.z]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                <boxGeometry args={[length, wall.height, wall.thickness]} />
                <meshStandardMaterial color="#334155" roughness={0.5} />
              </mesh>
            );
          })}
        </group>
        
        <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={30} blur={2.5} far={10} color="#000000" />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-lg flex gap-2 shadow-xl">
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Reset View">
            <RotateCcw size={16} />
          </button>
          <div className="w-px bg-slate-700 mx-1" />
          <div className="flex items-center gap-2 px-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Orbit Mode Active
          </div>
        </div>
      </div>

      {!data && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-10">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
          <p className="text-slate-400 font-medium animate-pulse">Aguardando planta para visualização 3D...</p>
        </div>
      )}
    </div>
  );
};
