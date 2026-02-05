
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface RagdollPart {
  body: CANNON.Body;
  mesh: THREE.Mesh;
}

export class RagdollSystem {
  parts: RagdollPart[] = [];
  constraints: CANNON.Constraint[] = [];
  world: CANNON.World;
  scene: THREE.Scene;

  constructor(world: CANNON.World, scene: THREE.Scene, x: number, y: number, z: number) {
    this.world = world;
    this.scene = scene;
    this.create(x, y, z);
  }

  private createPart(shape: CANNON.Shape, mass: number, position: CANNON.Vec3, material: THREE.Material): RagdollPart {
    const body = new CANNON.Body({ mass, material: new CANNON.Material('limb') });
    body.addShape(shape);
    body.position.copy(position);
    
    let geometry: THREE.BufferGeometry;
    if (shape instanceof CANNON.Sphere) {
      geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
    } else if (shape instanceof CANNON.Box) {
      geometry = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
    } else {
      geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8); // Fallback
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.parts.push({ body, mesh });
    this.world.addBody(body);
    this.scene.add(mesh);
    return { body, mesh };
  }

  private create(x: number, y: number, z: number) {
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
    const clothMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });

    // Head
    const head = this.createPart(new CANNON.Sphere(0.15), 1, new CANNON.Vec3(x, y + 1.2, z), skinMaterial);
    
    // Torso
    const torso = this.createPart(new CANNON.Box(new CANNON.Vec3(0.2, 0.3, 0.1)), 4, new CANNON.Vec3(x, y + 0.75, z), clothMaterial);
    
    // Pelvis
    const pelvis = this.createPart(new CANNON.Box(new CANNON.Vec3(0.18, 0.1, 0.1)), 2, new CANNON.Vec3(x, y + 0.35, z), clothMaterial);

    // Arms
    const armSize = new CANNON.Vec3(0.05, 0.2, 0.05);
    const LUArm = this.createPart(new CANNON.Box(armSize), 1, new CANNON.Vec3(x - 0.3, y + 0.9, z), skinMaterial);
    const LLArm = this.createPart(new CANNON.Box(armSize), 1, new CANNON.Vec3(x - 0.3, y + 0.5, z), skinMaterial);
    const RUArm = this.createPart(new CANNON.Box(armSize), 1, new CANNON.Vec3(x + 0.3, y + 0.9, z), skinMaterial);
    const RLArm = this.createPart(new CANNON.Box(armSize), 1, new CANNON.Vec3(x + 0.3, y + 0.5, z), skinMaterial);

    // Legs
    const legSize = new CANNON.Vec3(0.07, 0.25, 0.07);
    const LULeg = this.createPart(new CANNON.Box(legSize), 2, new CANNON.Vec3(x - 0.12, y + 0.1, z), clothMaterial);
    const LLLeg = this.createPart(new CANNON.Box(legSize), 2, new CANNON.Vec3(x - 0.12, y - 0.4, z), skinMaterial);
    const RULeg = this.createPart(new CANNON.Box(legSize), 2, new CANNON.Vec3(x + 0.12, y + 0.1, z), clothMaterial);
    const RLLeg = this.createPart(new CANNON.Box(legSize), 2, new CANNON.Vec3(x + 0.12, y - 0.4, z), skinMaterial);

    // Constraints
    const neck = new CANNON.ConeTwistConstraint(head.body, torso.body, {
      pivotA: new CANNON.Vec3(0, -0.15, 0), pivotB: new CANNON.Vec3(0, 0.3, 0),
      axisA: CANNON.Vec3.UNIT_Y, axisB: CANNON.Vec3.UNIT_Y, angle: Math.PI / 4
    });
    
    const waist = new CANNON.PointToPointConstraint(torso.body, new CANNON.Vec3(0, -0.3, 0), pelvis.body, new CANNON.Vec3(0, 0.1, 0));

    // Shoulder constraints
    const LShoulder = new CANNON.ConeTwistConstraint(torso.body, LUArm.body, {
      pivotA: new CANNON.Vec3(-0.2, 0.25, 0), pivotB: new CANNON.Vec3(0, 0.2, 0), angle: Math.PI / 3
    });
    const RShoulder = new CANNON.ConeTwistConstraint(torso.body, RUArm.body, {
      pivotA: new CANNON.Vec3(0.2, 0.25, 0), pivotB: new CANNON.Vec3(0, 0.2, 0), angle: Math.PI / 3
    });

    // Joint constraints
    const LElbow = new CANNON.PointToPointConstraint(LUArm.body, new CANNON.Vec3(0, -0.2, 0), LLArm.body, new CANNON.Vec3(0, 0.2, 0));
    const RElbow = new CANNON.PointToPointConstraint(RUArm.body, new CANNON.Vec3(0, -0.2, 0), RLArm.body, new CANNON.Vec3(0, 0.2, 0));
    
    const LHip = new CANNON.ConeTwistConstraint(pelvis.body, LULeg.body, {
      pivotA: new CANNON.Vec3(-0.1, -0.1, 0), pivotB: new CANNON.Vec3(0, 0.25, 0), angle: Math.PI / 4
    });
    const RHip = new CANNON.ConeTwistConstraint(pelvis.body, RULeg.body, {
      pivotA: new CANNON.Vec3(0.1, -0.1, 0), pivotB: new CANNON.Vec3(0, 0.25, 0), angle: Math.PI / 4
    });

    const LKnee = new CANNON.PointToPointConstraint(LULeg.body, new CANNON.Vec3(0, -0.25, 0), LLLeg.body, new CANNON.Vec3(0, 0.25, 0));
    const RKnee = new CANNON.PointToPointConstraint(RULeg.body, new CANNON.Vec3(0, -0.25, 0), RLLeg.body, new CANNON.Vec3(0, 0.25, 0));

    [neck, waist, LShoulder, RShoulder, LElbow, RElbow, LHip, RHip, LKnee, RKnee].forEach(c => {
      this.world.addConstraint(c);
      this.constraints.push(c);
    });
  }

  update() {
    this.parts.forEach(p => {
      p.mesh.position.copy(p.body.position as any);
      p.mesh.quaternion.copy(p.body.quaternion as any);
    });
  }

  destroy() {
    this.parts.forEach(p => {
      this.world.removeBody(p.body);
      this.scene.remove(p.mesh);
    });
    this.constraints.forEach(c => this.world.removeConstraint(c));
  }
}

export const createEnvironment3D = (world: CANNON.World, scene: THREE.Scene, type: string) => {
  const floorMaterial = new CANNON.Material('floor');
  const wallMaterial = new CANNON.Material('wall');
  
  // Ground
  const groundBody = new CANNON.Body({ mass: 0, material: floorMaterial });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x1e293b })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const interactiveElements: { body: CANNON.Body, mesh: THREE.Mesh, update?: () => void }[] = [];

  if (type === 'Playground') {
    const boxShape = new CANNON.Box(new CANNON.Vec3(1, 0.1, 1));
    const platform = new CANNON.Body({ mass: 0 });
    platform.addShape(boxShape);
    platform.position.set(2, 1, 0);
    world.addBody(platform);

    const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0x475569 }));
    platformMesh.position.copy(platform.position as any);
    scene.add(platformMesh);

    // Floating bouncy sphere
    const sphere = new CANNON.Body({ mass: 5, material: new CANNON.Material({ restitution: 0.9 }) });
    sphere.addShape(new CANNON.Sphere(0.5));
    sphere.position.set(-2, 5, 0);
    world.addBody(sphere);
    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0x6366f1 }));
    scene.add(sphereMesh);
    interactiveElements.push({ body: sphere, mesh: sphereMesh });
  }

  if (type === 'The Grinder') {
    const createGear = (x: number, direction: number) => {
      const gearBody = new CANNON.Body({ mass: 0 });
      gearBody.addShape(new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.2)));
      gearBody.position.set(x, 1, 0);
      world.addBody(gearBody);
      const gearMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      scene.add(gearMesh);
      return { body: gearBody, mesh: gearMesh, update: () => {
        gearBody.quaternion.setFromEuler(0, 0, Date.now() * 0.002 * direction);
        gearMesh.quaternion.copy(gearBody.quaternion as any);
      }};
    };
    interactiveElements.push(createGear(-1, 1));
    interactiveElements.push(createGear(1, -1));
  }

  if (type === 'Bouncy Castle') {
      groundBody.material!.restitution = 1.5;
      groundMesh.material.color.setHex(0xec4899);
      for(let i=0; i<5; i++) {
          const ball = new CANNON.Body({ mass: 1, material: new CANNON.Material({ restitution: 1.2 }) });
          ball.addShape(new CANNON.Sphere(0.3));
          ball.position.set(Math.random()*4-2, 4, Math.random()*4-2);
          world.addBody(ball);
          const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
          scene.add(ballMesh);
          interactiveElements.push({ body: ball, mesh: ballMesh });
      }
  }

  return { ground: groundBody, elements: interactiveElements };
};
