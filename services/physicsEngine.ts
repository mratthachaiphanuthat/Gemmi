
import Matter from 'matter-js';

export const createRagdoll = (x: number, y: number, scale: number = 1) => {
  const { Bodies, Body, Constraint, Composite } = Matter;
  
  const group = Body.nextGroup(true);
  const headOptions = { collisionFilter: { group }, friction: 0.3, restitution: 0.5, render: { fillStyle: '#fbbf24' } };
  const limbOptions = { collisionFilter: { group }, friction: 0.3, restitution: 0.5, render: { fillStyle: '#3b82f6' } };
  const chestOptions = { collisionFilter: { group }, friction: 0.3, restitution: 0.5, render: { fillStyle: '#1e40af' } };

  const head = Bodies.circle(x, y - 60 * scale, 15 * scale, headOptions);
  const chest = Bodies.rectangle(x, y, 40 * scale, 60 * scale, chestOptions);
  
  const armLUpper = Bodies.rectangle(x - 30 * scale, y - 20 * scale, 12 * scale, 40 * scale, limbOptions);
  const armLDown = Bodies.rectangle(x - 30 * scale, y + 20 * scale, 10 * scale, 40 * scale, limbOptions);
  
  const armRUpper = Bodies.rectangle(x + 30 * scale, y - 20 * scale, 12 * scale, 40 * scale, limbOptions);
  const armRDown = Bodies.rectangle(x + 30 * scale, y + 20 * scale, 10 * scale, 40 * scale, limbOptions);
  
  const legLUpper = Bodies.rectangle(x - 12 * scale, y + 55 * scale, 15 * scale, 50 * scale, limbOptions);
  const legLDown = Bodies.rectangle(x - 12 * scale, y + 105 * scale, 12 * scale, 50 * scale, limbOptions);
  
  const legRUpper = Bodies.rectangle(x + 12 * scale, y + 55 * scale, 15 * scale, 50 * scale, limbOptions);
  const legRDown = Bodies.rectangle(x + 12 * scale, y + 105 * scale, 12 * scale, 50 * scale, limbOptions);

  const ragdoll = Composite.create({ label: 'Ragdoll' });
  Composite.add(ragdoll, [head, chest, armLUpper, armLDown, armRUpper, armRDown, legLUpper, legLDown, legRUpper, legRDown]);

  // Neck
  Composite.add(ragdoll, Constraint.create({
    bodyA: head, bodyB: chest, pointA: { x: 0, y: 15 * scale }, pointB: { x: 0, y: -30 * scale },
    stiffness: 0.6, length: 2, render: { visible: false }
  }));

  // Arms
  Composite.add(ragdoll, [
    Constraint.create({ bodyA: chest, bodyB: armLUpper, pointA: { x: -20 * scale, y: -25 * scale }, pointB: { x: 0, y: -20 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: armLUpper, bodyB: armLDown, pointA: { x: 0, y: 20 * scale }, pointB: { x: 0, y: -20 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: chest, bodyB: armRUpper, pointA: { x: 20 * scale, y: -25 * scale }, pointB: { x: 0, y: -20 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: armRUpper, bodyB: armRDown, pointA: { x: 0, y: 20 * scale }, pointB: { x: 0, y: -20 * scale }, stiffness: 0.4, length: 2 }),
  ]);

  // Legs
  Composite.add(ragdoll, [
    Constraint.create({ bodyA: chest, bodyB: legLUpper, pointA: { x: -10 * scale, y: 30 * scale }, pointB: { x: 0, y: -25 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: legLUpper, bodyB: legLDown, pointA: { x: 0, y: 25 * scale }, pointB: { x: 0, y: -25 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: chest, bodyB: legRUpper, pointA: { x: 10 * scale, y: 30 * scale }, pointB: { x: 0, y: -25 * scale }, stiffness: 0.4, length: 2 }),
    Constraint.create({ bodyA: legRUpper, bodyB: legRDown, pointA: { x: 0, y: 25 * scale }, pointB: { x: 0, y: -25 * scale }, stiffness: 0.4, length: 2 }),
  ]);

  return ragdoll;
};

export const createEnvironment = (world: Matter.World, type: string, width: number, height: number) => {
  const { Bodies, Composite } = Matter;
  
  // Floor and Walls (Invisible or visible borders)
  const wallStyle = { fillStyle: '#1e293b' };
  const ground = Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true, render: wallStyle });
  const ceiling = Bodies.rectangle(width / 2, -50, width, 100, { isStatic: true, render: wallStyle });
  const leftWall = Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true, render: wallStyle });
  const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true, render: wallStyle });

  Composite.add(world, [ground, ceiling, leftWall, rightWall]);

  if (type === 'Playground') {
    Composite.add(world, [
      Bodies.rectangle(200, height - 100, 200, 40, { isStatic: true, render: { fillStyle: '#475569' } }),
      Bodies.rectangle(width - 200, height - 200, 200, 40, { isStatic: true, render: { fillStyle: '#475569' } }),
      Bodies.circle(width / 2, height / 2, 60, { isStatic: true, render: { fillStyle: '#6366f1' } }),
      Bodies.circle(100, 100, 30, { restitution: 0.9, render: { fillStyle: '#ef4444' } }),
      Bodies.circle(width - 100, 100, 30, { restitution: 0.9, render: { fillStyle: '#ef4444' } }),
    ]);
  } else if (type === 'Bouncy Castle') {
    const bouncePad = Bodies.rectangle(width / 2, height - 20, width, 60, { 
      isStatic: true, 
      restitution: 1.5,
      render: { fillStyle: '#ec4899' } 
    });
    Composite.add(world, bouncePad);
    for (let i = 0; i < 15; i++) {
        Composite.add(world, Bodies.circle(Math.random() * width, Math.random() * height / 2, 20, { 
            restitution: 1.1, 
            render: { fillStyle: '#f472b6' } 
        }));
    }
  } else if (type === 'Pin Machine') {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 12; c++) {
        Composite.add(world, Bodies.circle(c * (width / 11), 150 + r * 100, 10, { isStatic: true, render: { fillStyle: '#94a3b8' } }));
      }
    }
  } else if (type === 'The Grinder') {
    const gear1 = Bodies.polygon(width / 3, height / 2, 8, 80, { isStatic: true, render: { fillStyle: '#4b5563' } });
    const gear2 = Bodies.polygon(2 * width / 3, height / 2, 8, 80, { isStatic: true, render: { fillStyle: '#4b5563' } });
    Composite.add(world, [gear1, gear2]);
    // Rotation is handled in the main loop
    return { gears: [gear1, gear2] };
  }
  return {};
};
