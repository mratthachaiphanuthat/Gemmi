
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SetupType, NarratorComment } from './types';
import { RagdollSystem, createEnvironment3D } from './services/physicsEngine';
import { getNarratorComment } from './services/geminiService';

const App: React.FC = () => {
  const [setup, setSetup] = useState<SetupType>(SetupType.PLAYGROUND);
  const [comment, setComment] = useState<NarratorComment>({ text: "3D conversion complete. Let the kinetic experiments begin.", mood: 'snarky' });
  const [isLoadingComment, setIsLoadingComment] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const ragdollRef = useRef<RagdollSystem | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dragPlaneRef = useRef<THREE.Mesh | null>(null);
  const mouseConstraintRef = useRef<CANNON.PointToPointConstraint | null>(null);
  const dragBodyRef = useRef<CANNON.Body | null>(null);
  const lastActionTime = useRef<number>(0);

  const triggerAIComment = useCallback(async (action: string) => {
    const now = Date.now();
    if (now - lastActionTime.current < 6000) return;
    lastActionTime.current = now;
    setIsLoadingComment(true);
    const newComment = await getNarratorComment(action, setup);
    setComment(newComment);
    setIsLoadingComment(false);
  }, [setup]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 2. Setup Cannon Physics
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    worldRef.current = world;

    // 3. Setup Dragging Helpers
    const dragPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(dragPlane);
    dragPlaneRef.current = dragPlane;

    const raycaster = new THREE.Raycaster();
    const mousePos = new THREE.Vector2();
    let isDragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mousePos, camera);
      
      const intersects = raycaster.intersectObjects(ragdollRef.current?.parts.map(p => p.mesh) || []);
      if (intersects.length > 0) {
        isDragging = true;
        const targetMesh = intersects[0].object as THREE.Mesh;
        const part = ragdollRef.current?.parts.find(p => p.mesh === targetMesh);
        if (part) {
          dragBodyRef.current = part.body;
          const hitPoint = intersects[0].point;
          
          // Align drag plane to camera
          dragPlane.position.copy(hitPoint);
          dragPlane.lookAt(camera.position);

          const localPivot = part.body.pointToLocalFrame(new CANNON.Vec3(hitPoint.x, hitPoint.y, hitPoint.z));
          const emptyBody = new CANNON.Body({ mass: 0 });
          mouseConstraintRef.current = new CANNON.PointToPointConstraint(part.body, localPivot, emptyBody, new CANNON.Vec3(hitPoint.x, hitPoint.y, hitPoint.z));
          world.addConstraint(mouseConstraintRef.current);
          
          triggerAIComment("The player is handling the test subject's 3D anatomy.");
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mouseConstraintRef.current) return;
      mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mousePos, camera);
      const intersects = raycaster.intersectObject(dragPlane);
      if (intersects.length > 0) {
        const p = intersects[0].point;
        mouseConstraintRef.current.pivotB.copy(new CANNON.Vec3(p.x, p.y, p.z));
      }
    };

    const handleMouseUp = () => {
      if (mouseConstraintRef.current) {
        world.removeConstraint(mouseConstraintRef.current);
        mouseConstraintRef.current = null;
      }
      isDragging = false;
      dragBodyRef.current = null;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 4. Initial Env & Ragdoll
    const ragdoll = new RagdollSystem(world, scene, 0, 3, 0);
    ragdollRef.current = ragdoll;
    let env = createEnvironment3D(world, scene, setup);

    // 5. Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      world.fixedStep();
      ragdoll.update();
      env.elements.forEach(e => {
          if (e.update) e.update();
          e.mesh.position.copy(e.body.position as any);
          e.mesh.quaternion.copy(e.body.quaternion as any);
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [setup, triggerAIComment]);

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'snarky': return 'text-amber-400';
      case 'impressed': return 'text-green-400';
      case 'concerned': return 'text-blue-400';
      case 'evil': return 'text-red-500';
      default: return 'text-white';
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Narrative Box */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl flex items-start space-x-4 pointer-events-auto">
          <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-600 ${isLoadingComment ? 'animate-pulse' : ''}`}>
             <i className={`fas fa-brain ${getMoodColor(comment.mood)} text-xl`}></i>
          </div>
          <div className="flex-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Dimensional Observer</h3>
            <p className={`text-sm md:text-base font-medium ${getMoodColor(comment.mood)} italic leading-relaxed`}>
              "{comment.text}"
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex flex-wrap justify-center items-center gap-3">
          {Object.values(SetupType).map((type) => (
            <button
              key={type}
              onClick={() => setSetup(type)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border ${
                setup === type 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 pointer-events-none hidden lg:block text-right">
        <div className="bg-slate-900/40 backdrop-blur-sm p-4 rounded-lg border border-slate-700/30">
          <p className="text-slate-400 text-xs font-mono uppercase mb-2">3D Manipulation</p>
          <ul className="text-slate-300 text-sm space-y-1">
            <li><span className="text-indigo-400 font-bold">CLICK & DRAG</span> limb to toss</li>
            <li><span className="text-indigo-400 font-bold">DEPTH</span> is handled automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
