import Matter from 'matter-js';
import './style.css';

// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events;

// Create engine
const engine = Engine.create();
const world = engine.world;

// Create renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false, // Solid shapes
        background: '#fff'
    }
});

Render.run(render);

// Create runner
const runner = Runner.create();
Runner.run(runner, engine);

// Boundaries
const wallThickness = 150; // Thick walls so fast objects don't tunnel through easily
const width = window.innerWidth;
const height = window.innerHeight;

const ground = Bodies.rectangle(width / 2, height + wallThickness / 2 - 10, width + 200, wallThickness, { 
    isStatic: true,
    render: { fillStyle: '#000' }
});

const leftWall = Bodies.rectangle(0 - wallThickness / 2, height / 2, wallThickness, height * 2, { 
    isStatic: true,
    render: { fillStyle: '#000' }
});

const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { 
    isStatic: true,
    render: { fillStyle: '#000' }
});

Composite.add(world, [ground, leftWall, rightWall]);

// Mouse interaction
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});

Composite.add(world, mouseConstraint);

// Keep the mouse in sync with rendering
render.mouse = mouse;

// Spawning Logic
const minBallRadius = 20;
const maxBallRadius = 160; // 8x min
// We'll manage balls in an array to remove the oldest one
let balls = [];
const maxBalls = 60; // Just a safety cap in case logic fails, but we want 1 per sec, disappearing. 
// Original Yugop behavior: 1 new ball every second, 1 old ball removed.
// The "falling" balls usually accumulate. 
// If we want "every second 1 new ball appears and 1 old ball disappears", the count would stay constant.
// But the prompt says "her saniye 1 yeni top oluşuyor 1 tane de eski toplardan biri yok oluyordu".
// This implies a constant number of balls after an initial buildup?
// Or maybe it starts from 0?
// "Meydana gelen" implies new ones. 
// If I start with 0, and every second I add one and remove one, I will have 0 balls (add 1, remove 1).
// Maybe it builds up to a certain amount? 
// Or maybe the prompt implies the *rate* is balanced *eventually*.
// Let's assume it builds up or there's a delay before removal starts.
// Or maybe "1 tane de eski toplardan biri yok oluyordu" implies a steady state.
// Let's implement a queue. We add a ball. If balls.length > N, we remove the first one.
// The prompt says "real time 2D fizik motoru çalışıyordu".
// Let's target a reasonable number of balls on screen, say 50.
// So we spawn every 1000ms.
// And we despawn? If we despawn every 1000ms, we just cycle 1 ball if we have 1.
// Maybe the user means: after some time, or continuously?
// Use a lifespan? Or a fixed count cap?
// "1 tane de eski toplardan biri yok oluyordu" matches the spawn rate.
// This suggests a constant count is maintained.
// But if we start with 0, we can't remove.
// Let's start adding. Maybe after 10-20 balls we start removing?
// Let's set a target count, e.g. 30 balls.

const targetBallCount = 30;

function spawnBall() {
    const x = Math.random() * (width - 100) + 50;
    const y = -50; // Start above screen
    const radius = Math.random() * (maxBallRadius - minBallRadius) + minBallRadius;
    const ball = Bodies.circle(x, y, radius, {
        restitution: 0.9, // Bouncy
        friction: 0.005,
        render: {
            fillStyle: '#000' // Black balls
        }
    });

    Composite.add(world, ball);
    balls.push(ball);

    // Remove oldest if we exceed target or if we want to enforce the "1 in, 1 out" rule strictlly after some buildup
    // Let's just enforce a max count to keep it performant and matching the "equilibrium" idea.
    if (balls.length > targetBallCount) {
        const oldest = balls.shift();
        Composite.remove(world, oldest);
    }
}

setInterval(spawnBall, 1000); // 1 per second

// Window resize handling
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    
    // Update boundaries
    Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight + wallThickness / 2 - 10 });
    Matter.Body.setPosition(rightWall, { x: window.innerWidth + wallThickness / 2, y: window.innerHeight / 2 });
});
