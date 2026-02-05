
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { SetupType, NarratorComment } from './types';
import { createRagdoll, createEnvironment } from './services/physicsEngine';
import { getNarratorComment } from './services/geminiService';

const App: React.FC = () => {
  const [setup, setSetup] = useState<SetupType>(SetupType.PLAYGROUND);
  const [comment, setComment] = useState<NarratorComment>({ text: "Welcome to the Lab. Try not to break him too much.", mood: 'snarky' });
  const [isLoadingComment, setIsLoadingComment] = useState(false);
  
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const lastActionTime = useRef<number>(0);

  const triggerAIComment = useCallback(async (action: string) => {
    const now = Date.now();
    if (now - lastActionTime.current < 5000) return; // Rate limit AI comments
    lastActionTime.current = now;

    setIsLoadingComment(true);
    const newComment = await getNarratorComment(action, setup);
    setComment(newComment);
    setIsLoadingComment(false);
  }, [setup]);

  const initPhysics = useCallback(() => {
    if (!sceneRef.current) return;

    // Cleanup previous instance
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      Matter.Render.stop(renderRef.current!);
      Matter.Runner.stop(runnerRef.current!);
      renderRef.current!.canvas.remove();
      renderRef.current!.textures = {};
    }

    const engine = Matter.Engine.create();
    const world = engine.world;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent'
      }
    });

    const runner = Matter.Runner.create();
    
    // Create setup
    const envData = createEnvironment(world, setup, width, height);

    // Create Ragdoll
    const ragdoll = createRagdoll(width / 2, 100);
    Matter.Composite.add(world, ragdoll);

    // Mouse control
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    Matter.Composite.add(world, mouseConstraint);

    // Special behavior for "The Grinder"
    if (setup === SetupType.THE_GRINDER && envData.gears) {
      Matter.Events.on(engine, 'beforeUpdate', () => {
        envData.gears.forEach((gear: Matter.Body, i: number) => {
          Matter.Body.setAngle(gear, gear.angle + (i === 0 ? 0.05 : -0.05));
        });
      });
    }

    // Capture dragging events for AI commentary
    Matter.Events.on(mouseConstraint, 'startdrag', () => {
      triggerAIComment("The player is dragging a limb aggressively.");
    });

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;
    renderRef.current = render;

    // Adjust gravity for certain levels
    if (setup === SetupType.GRAVITY_WELL) {
        engine.gravity.y = -0.5;
    } else {
        engine.gravity.y = 1;
    }

  }, [setup, triggerAIComment]);

  useEffect(() => {
    initPhysics();
    
    const handleResize = () => {
      initPhysics();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [initPhysics]);

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
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 opacity-50 pointer-events-none" />
      
      {/* Physics Canvas Container */}
      <div ref={sceneRef} className="absolute inset-0" />

      {/* Narrative Box */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl flex items-start space-x-4 animate-in fade-in slide-in-from-top-4 duration-500 pointer-events-auto">
          <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-600 ${isLoadingComment ? 'animate-pulse' : ''}`}>
             <i className={`fas fa-microchip ${getMoodColor(comment.mood)} text-xl`}></i>
          </div>
          <div className="flex-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">AI Narrator</h3>
            <p className={`text-sm md:text-base font-medium ${getMoodColor(comment.mood)} italic`}>
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
              onClick={() => {
                setSetup(type);
                triggerAIComment(`The player switched to the ${type} experiment.`);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border ${
                setup === type 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
          
          <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block" />
          
          <button
            onClick={() => {
                initPhysics();
                triggerAIComment("The player reset the simulation after a horrific accident.");
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-all border border-rose-400 shadow-lg flex items-center gap-2"
          >
            <i className="fas fa-undo"></i> Reset
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none hidden lg:block text-right">
        <div className="bg-slate-900/40 backdrop-blur-sm p-4 rounded-lg border border-slate-700/30">
          <p className="text-slate-400 text-xs font-mono uppercase mb-2">Lab Controls</p>
          <ul className="text-slate-300 text-sm space-y-1">
            <li><span className="text-indigo-400 font-bold">DRAG</span> to move limbs</li>
            <li><span className="text-indigo-400 font-bold">TOSS</span> to generate kinetic energy</li>
            <li><span className="text-indigo-400 font-bold">SWITCH</span> to test durability</li>
          </ul>
        </div>
      </div>

      {/* Visual FX overlay */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-indigo-500/5 mix-blend-overlay"></div>
    </div>
  );
};

export default App;
