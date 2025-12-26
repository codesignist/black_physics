// Module aliases
// Matter is now available globally via CDN

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

function spawnBall(isInitial = false) {
    const x = Math.random() * (width - 100) + 50;
    // If initial, anywhere above screen in a stream. If not, start just above.
    const y = isInitial ? -(Math.random() * 2000 + 100) : -150; 
    
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

    // Remove oldest only if we are adding new ones (live cycle), not during initial setup
    if (!isInitial && balls.length > targetBallCount) {
        const oldest = balls.shift();
        Composite.remove(world, oldest);
    }
}

// Initial Spawn
function spawnInitialBalls() {
    for (let i = 0; i < targetBallCount; i++) {
        spawnBall(true);
    }
}
spawnInitialBalls();

setInterval(() => spawnBall(false), 1000); // 1 per second

// Custom Render for Plus signs and Growing Ball
let isGrowing = false;
let growthPos = { x: 0, y: 0 };
let currentGrowthRadius = minBallRadius;

Events.on(mouseConstraint, 'mousedown', function(event) {
    // Check if we clicked on a body (handled by MouseConstraint)
    const mousePosition = event.mouse.position;
    const bodies = Composite.allBodies(world);
    const clickedBody = Matter.Query.point(bodies, mousePosition)[0];

    if (!clickedBody) {
        // Clicked on empty space, start growing
        isGrowing = true;
        growthPos = { ...mousePosition };
        currentGrowthRadius = minBallRadius;
    }
});

Events.on(mouseConstraint, 'mouseup', function(event) {
    if (isGrowing) {
        // Spawn the ball with current size
        const ball = Bodies.circle(growthPos.x, growthPos.y, currentGrowthRadius, {
            restitution: 0.9,
            friction: 0.005,
            render: { fillStyle: '#000' }
        });
        
        Composite.add(world, ball);
        balls.push(ball);

        // Remove oldest to maintain count if needed, or just let it be user-added extra
        // If we want strictly 30, we should remove. If we allow extras, no remove.
        // Let's remove to keep performance/logic consistent.
        if (balls.length > targetBallCount) {
            const oldest = balls.shift();
            Composite.remove(world, oldest);
        }
        
        isGrowing = false;
    }
});

Events.on(render, 'afterRender', function() {
    const context = render.context;
    
    // Draw Growing Ball
    if (isGrowing) {
        // Increase size
        if (currentGrowthRadius < maxBallRadius) {
            currentGrowthRadius += 2; // Growth speed
        }
        
        context.beginPath();
        context.arc(growthPos.x, growthPos.y, currentGrowthRadius, 0, 2 * Math.PI);
        context.fillStyle = '#000';
        context.fill();
        
        // Draw Plus on growing ball (optional, but looks good)
        context.save();
        context.translate(growthPos.x, growthPos.y);
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("+", currentGrowthRadius * 0.6, 0); // Roughly position
        context.fillText("+", -currentGrowthRadius * 0.6, 0);
        context.restore();
    }

    // Draw Plus signs on existing balls
    context.font = "bold 20px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";

    balls.forEach(ball => {
        const r = ball.circleRadius;
        const angle = ball.angle;
        
        const dist = r * 0.6; // Distance from center

        context.save();
        
        // Draw + at point 1
        const x1 = ball.position.x + Math.cos(angle) * dist;
        const y1 = ball.position.y + Math.sin(angle) * dist;
        context.translate(x1, y1);
        context.rotate(angle);
        context.fillText("+", 0, 0);
        context.restore();

        context.save();
        // Draw + at point 2
        const x2 = ball.position.x + Math.cos(angle + Math.PI) * dist;
        const y2 = ball.position.y + Math.sin(angle + Math.PI) * dist;
        context.translate(x2, y2);
        context.rotate(angle);
        context.fillText("+", 0, 0);
        context.restore();
    });
});

// Window resize handling
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    
    // Update boundaries
    Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight + wallThickness / 2 - 10 });
    Matter.Body.setPosition(rightWall, { x: window.innerWidth + wallThickness / 2, y: window.innerHeight / 2 });
});
