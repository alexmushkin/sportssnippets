const ballSize = 100;

class Ball {
    constructor(isHero, startX, startY) {
        // isHero ignored
        this.element = this.createBallElement();
        document.body.appendChild(this.element);

        // Initial position
        if (startX !== undefined && startY !== undefined) {
            this.x = startX;
            this.y = startY;
        } else {
            this.x = (window.innerWidth / 2) - (ballSize / 2);
            this.y = -200;
        }

        // Initial physics
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * 5;

        // Intro physics settings
        this.gravity = 0.4;
        this.bounceFactor = 0.7 + (Math.random() * 0.2);

        this.active = true;
        this.wallsEnabled = true;

        // State machine props
        this.mode = 'NORMAL';
        this.isShooting = false;
        this.hasSettled = false;
        this.waitingForNext = false;
        this.isPaused = false;
    }

    createBallElement() {
        const div = document.createElement('div');
        div.className = 'ball';
        div.innerHTML = `
            <div class="line horizontal"></div>
            <div class="line vertical"></div>
            <div class="line curve-left"></div>
            <div class="line curve-right"></div>
        `;

        div.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger other clicks
            if (this === heroBall) {
                this.isPaused = !this.isPaused;
            }
        });

        return div;
    }

    update(dtScale = 1) {
        if (!this.active) return;
        if (this.isPaused) return;

        // --- MODE: NORMAL (Standard Physics) ---
        if (this.mode === 'NORMAL') {
            // Apply gravity
            this.vy += this.gravity * dtScale;

            // Air Resistance
            if (this.gravity !== 0) {
                this.vx *= Math.pow(0.99, dtScale);
            }

            // Update position
            this.x += this.vx * dtScale;
            this.y += this.vy * dtScale;

            // Wall collisions
            if (this.wallsEnabled) {
                // Right Wall
                if (this.x + ballSize > window.innerWidth) {
                    this.x = window.innerWidth - ballSize;
                    this.vx *= -1;
                }
                // Left Wall
                if (this.x < 0) {
                    this.x = 0;
                    this.vx *= -1;
                }

                // Floor collision
                if (this.y + ballSize > window.innerHeight) {
                    this.y = window.innerHeight - ballSize;

                    if (this === heroBall) {
                        // HERO BALL: Consistent High Bounce (Don't die)
                        // Removed chaotic kick. Just energy retention.
                        this.vy *= -0.85;
                    } else {
                        // STANDARD BALLS: Regular bounce
                        this.vy *= -this.bounceFactor;
                    }

                    // Restart Sequence Logic
                    // Trigger 1.5s timer on FIRST impact
                    if (this === heroBall && this.isShooting && !this.waitingForNext) {
                        this.waitingForNext = true;
                        setTimeout(() => {
                            this.waitingForNext = false;
                            scheduleNextShot(this);
                        }, 1500); // 1.5s after hitting ground
                    }
                }

                // Ceiling collision
                if (this.y < 0) {
                    this.y = 0;
                    this.vy *= -1;
                }

            } else {
                // Walls disabled cleanup (only if way off screen)
                if (this.y > window.innerHeight + 500) {
                    // Safety net: if it falls endlessly, reset.
                    if (this === heroBall && this.isShooting) {
                        this.mode = 'NORMAL';
                        this.x = window.innerWidth / 2;
                        this.y = -200;
                        this.vx = 0;
                        this.vy = 0;
                        scheduleNextShot(this);
                    }
                }
            }

            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

            // SAFETY NET: Check for NaN or standard infinite fall
            if (isNaN(this.x) || isNaN(this.y)) {
                console.warn('Ball physics NaN detected. Resetting.');
                this.x = window.innerWidth / 2;
                this.y = window.innerHeight * 0.3;
                this.vx = 0;
                this.vy = 0;
                this.mode = 'NORMAL';
            }

            // SHOOTING LOOP CHECK:
            // REMOVED old settle check.
            // Restart is now handled purely by floor collision timing.
        }

        // --- MODE: FLOATING (Move to Rim) ---
        else if (this.mode === 'FLOATING') {
            // Lerp towards target
            const dx = this.floatTarget.x - this.x;
            const dy = this.floatTarget.y - this.y;

            // Ease out
            this.vx = dx * 0.03;
            this.vy = dy * 0.03;

            this.x += this.vx;
            this.y += this.vy;

            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

            // Check arrival (close enough)
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                startRattle(this);
            }
        }

        // --- MODE: RATTLING (Jitter on Rim) ---
        else if (this.mode === 'RATTLING') {
            const elapsed = Date.now() - this.rattleStartTime;

            if (elapsed > 1500) {
                dropThrough(this);
                return;
            }

            // Random jitter force
            this.x += ((Math.random() - 0.5) * 8) * dtScale;
            this.y += ((Math.random() - 0.5) * 8) * dtScale;

            // Constrain gently to rattle center
            const rattleCenterY = this.floatTarget.y + 20;
            const dx = this.floatTarget.x - this.x;
            const dy = rattleCenterY - this.y;

            this.x += (dx * 0.1) * dtScale;
            this.y += (dy * 0.1) * dtScale;

            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        }

        // --- MODE: DROPPING (Fall Through Net) ---
        else if (this.mode === 'DROPPING') {
            // Apply gravity manually
            this.vy += 0.4 * dtScale;
            this.x += this.vx * dtScale;
            this.y += this.vy * dtScale;

            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

            // Check if hit floor
            if (this.y + ballSize > window.innerHeight) {
                this.y = window.innerHeight - ballSize;
                this.vy *= -0.6; // Dampened bounce

                // Switch back to normal physics to handle settling
                this.mode = 'NORMAL';
                this.wallsEnabled = true;
                this.hasSettled = true; // Mark as ready to check for settle
            }
        }
    }
}

const balls = [];

const totalBalls = 36; // 36 Pyramid balls (1 to 8)
const spanPercent = 0.9;
const totalWidth = window.innerWidth * spanPercent;
const startX = (window.innerWidth - totalWidth) / 2;
const step = totalBalls > 1 ? (totalWidth - ballSize) / (totalBalls - 1) : 0;

// Init balls
for (let i = 0; i < totalBalls; i++) {
    const x = startX + (i * step);
    const y = -250;
    const ball = new Ball(false, x, y);
    balls.push(ball);
}

// Randomly select is REMOVED
// We wait for the loop to pick one.

// Dynamic Pyramid Targets
let pyramidTargets = [];

function updatePyramidTargets(spacingFactor) {
    pyramidTargets = [];
    // 36 balls: 8-7-6-5-4-3-2-1
    const rows = 8;
    const centerY = window.innerHeight - 50;
    const centerX = window.innerWidth / 2;

    // Build from bottom up
    for (let r = 0; r < rows; r++) {
        const ballsInRow = rows - r; // 8, 7, 6...
        const rowY = centerY - (r * (ballSize * spacingFactor));

        const rowWidth = ballsInRow * ballSize;
        const rowStartX = centerX - (rowWidth / 2);

        for (let c = 0; c < ballsInRow; c++) {
            pyramidTargets.push({
                x: rowStartX + (c * ballSize),
                y: rowY
            });
        }
    }
}

// Initial calculation with default max spacing
updatePyramidTargets(0.85);

const startTime = Date.now();

function resolveCollisions() {
    // 1. Collision Delay: Let them bounce freely for 2.0s
    if (Date.now() - startTime < 2000) {
        return;
    }
    return;
}

// Continuous State Sync
let hoopFrameTick = 0;

function updateHoopBounds() {
    hoopFrameTick++;
    // Massively optimize: only check DOM rects every 4th frame. 
    // Since hoops float incredibly slowly (15px / 3000ms), checking every 66ms loses only 0.3px accuracy
    // Which is vastly better than destroying 60fps framerates!
    if (hoopFrameTick % 4 !== 0) return;

    const leftRim = document.querySelector('.left-hoop .rim');
    const rightRim = document.querySelector('.right-hoop .rim');

    if (leftRim) {
        const rect = leftRim.getBoundingClientRect();
        hoopState.left.x = rect.left + rect.width / 2;
        hoopState.left.y = rect.top;
    }
    if (rightRim) {
        const rect = rightRim.getBoundingClientRect();
        hoopState.right.x = rect.left + rect.width / 2;
        hoopState.right.y = rect.top;
    }
}

let cachedTargetSpacing = null;
let lastLoopTime = performance.now();

// FPS Tracker Removed
let fpsFrames = 0;
let lastFpsTime = performance.now();

let isPhysicsPaused = false;
document.addEventListener('click', (e) => {
    // Ignore clicks on links or the arrow toggle
    if (e.target.closest('a') || e.target.closest('#arrow-toggle')) return;
    
    // Only pause the hero ball
    if (typeof heroBall !== 'undefined' && heroBall) {
        heroBall.isPaused = !heroBall.isPaused;
    }
});

function loop() {
    const now = performance.now();
    let dt = now - lastLoopTime;
    lastLoopTime = now;

    if (isPhysicsPaused) {
        requestAnimationFrame(loop);
        return;
    }

    // FPS math removed

    if (dt > 100) dt = 100;
    const dtScale = dt / 16.666;

    updateHoopBounds(); 

    balls.forEach((ball, index) => {
        ball.update(dtScale);
    });

    if (cachedTargetSpacing === null) {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            const buttonRect = navButtons.getBoundingClientRect();
            const pyBase = window.innerHeight - 50;
            const margin = 20;
            const limitY = buttonRect.bottom + margin;

            const availableHeight = pyBase - limitY;
            let targetSpacing = availableHeight / (7 * ballSize);

            const maxSpacing = 0.85;
            const minSpacing = 0.45;

            cachedTargetSpacing = Math.max(minSpacing, Math.min(targetSpacing, maxSpacing));
            updatePyramidTargets(cachedTargetSpacing);
        }
    }
    requestAnimationFrame(loop);
}

// Handle resize
window.addEventListener('resize', () => {
    location.reload();
});

// Interaction State
let hasInteracted = false;

// Arrow Toggle Logic
const arrowToggle = document.getElementById('arrow-toggle');
const subtitleContainer = document.getElementById('subtitle-container');

if (arrowToggle && subtitleContainer) {
    arrowToggle.addEventListener('click', () => {
        arrowToggle.classList.toggle('expanded');
        subtitleContainer.classList.toggle('expanded');
        hasInteracted = true; // Enable fast physics
    });
}

// --- ADVANCED SHOOTING SEQUENCE ---

// Physics State (Mutable for Dragging)
const hoopState = {
    left: {
        x: 60,
        y: window.innerHeight * 0.3 + 20
    },
    right: {
        x: window.innerWidth - 140,
        y: window.innerHeight * 0.3 + 20
    }
};

// Aliases for legacy/easy access (read-only getters if possible, but simple var ref for now)
// We will replace direct usages of HOOP_LEFT_X etc with hoopState lookups.
/*
const HOOP_LEFT_X = 60;
const HOOP_RIGHT_X = window.innerWidth - 140;
const HOOP_Y = window.innerHeight * 0.3 + 20; 
*/
let heroBall = null; // Track the single hero ball

// Streak Tracking
let lastHoopSide = null; // 'LEFT' or 'RIGHT'
let consecutiveHoopCount = 0;

// Bezier Curve Helper
function getBezierPoint(t, p0, p1, p2) {
    const oneMinusT = 1 - t;
    return {
        x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
        y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
    };
}

function startShootingSequence() {
    // Wait for initial settle (3s)
    setTimeout(() => {
        initHeroBall();
    }, 3000);
}

function initHeroBall() {
    // Pick specific random ball ONCE
    const index = Math.floor(Math.random() * balls.length);
    heroBall = balls[index];

    // Turn Orange PERMANENTLY
    heroBall.element.classList.add('orange');

    // Start its first shot
    scheduleNextShot(heroBall);
}

function scheduleNextShot(ball) {
    // Prevent overlapping arcs if already shooting or toggled off
    if (ball.mode === 'ARCING' || ball.mode === 'RATTLING' || ball.isToggledOff) return;

    ball.isShooting = true;

    // Immediate launch (User wants no rest)
    startArc(ball);
}

function startArc(ball) {
    // Target Selection Logic (Prevent > 3 streaks)
    let goLeft;

    if (consecutiveHoopCount >= 3) {
        // Force Switch
        goLeft = (lastHoopSide === 'RIGHT');
    } else {
        // Random
        goLeft = Math.random() < 0.5;
    }

    // Update Streak
    const currentSide = goLeft ? 'LEFT' : 'RIGHT';
    if (currentSide === lastHoopSide) {
        consecutiveHoopCount++;
    } else {
        consecutiveHoopCount = 1;
        lastHoopSide = currentSide;
    }

    // Dynamic Target Selection
    const targetState = goLeft ? hoopState.left : hoopState.right;
    const targetX = targetState.x;

    // Track which side we are shooting at for physics updates
    ball.targetSide = goLeft ? 'left' : 'right';

    // ARC TARGET FIX:
    // User noted ball goes too low on first hit.
    // The rimFloor is at targetY - 125. The arc must end ABOVE that.
    // Setting target to targetY - 150 to ensure it drops ONTO the rim, not into it.
    const targetY = targetState.y - 150;

    ball.mode = 'ARCING';
    ball.wallsEnabled = false;

    ball.p0 = { x: ball.x, y: ball.y };
    ball.p2 = { x: targetX, y: targetY };

    // STEEPER ARC LOGIC
    // Move Control Point (p1) closer to Target (p2)
    // This makes the descent much more vertical ("swish" style)
    // User Request: Arc needs to be HIGHER. 
    // Base height = 1.0 * innerHeight (Top of screen). Plus random extra.
    const extraHeight = Math.random() < 0.4 ? 800 : 300;
    const arcHeight = window.innerHeight * 1.0 + (Math.random() * extraHeight);

    // Instead of midpoint, bias p1 heavily towards targetX (85% across)
    // this ensures the peak happens late, dropping purely down.
    const bias = 0.85;
    ball.p1 = {
        x: ball.x + (targetX - ball.x) * bias,
        y: targetY - arcHeight
    };

    ball.arcStartTime = Date.now();
    ball.arcDuration = 1500;
}

function startRattle(ball) {
    ball.mode = 'RATTLING';

    // User Request: 20% Chance of SWISH (No Rattle)
    if (Math.random() < 0.2) {
        dropThrough(ball);
        return;
    }

    ball.rattleStartTime = Date.now();

    // User Request: Bounce 1-5 times explicitly
    ball.rattleBouncesTarget = Math.floor(Math.random() * 4) + 2; // 2 to 5 bounces
    ball.rattleBouncesCount = 0;

    // User Request: 50% Chance to Miss
    ball.willMiss = Math.random() < 0.5;

    // Initial positioning relative to rim for the "drop in"
    // Ball should be slightly above rim to start the first bounce
    ball.vy = 12; // Start moving DOWN into the rim FASTER

    // Ensure X is within the rim width
    const targetState = ball.targetSide === 'left' ? hoopState.left : hoopState.right;
    const centerX = targetState.x;
    const rimY = targetState.y; // Unused here but available

    ball.vx = (centerX - ball.x) * 0.1; // Gently steer to center start
}

function dropThrough(ball) {
    ball.mode = 'DROPPING';

    // "Fall through with ease" and CENTER IT
    ball.vx = 0; // Kill ALL lateral movement

    // Snap X to exact center of the hoop it's currently at
    // Snap X to exact center of the hoop it's currently at
    const targetState = ball.targetSide === 'left' ? hoopState.left : hoopState.right;
    const centerX = targetState.x;
    // FIX: ball.x is Top-Left. Subtract radius to center it.
    ball.x = centerX - (ballSize / 2);

    // Initial downward push: Start slow for "floaty" feel
    ball.vy = 4;

    // Trigger Net Sway
    const isLeft = (ball.targetSide === 'left');
    const net = document.querySelector(isLeft ? '.left-hoop .net' : '.right-hoop .net');
    if (net) {
        net.classList.remove('sway'); // Reset
        void net.offsetWidth; // Trigger reflow
        net.classList.add('sway');
    }
}

// Override update method
const originalUpdate = Ball.prototype.update;

Ball.prototype.update = function (dtScale = 1) {
    if (!this.mode || this.mode === 'NORMAL') {
        originalUpdate.call(this, dtScale);

        // Loop Logic - Only for Hero Ball
        if (this === heroBall && this.isShooting && this.hasSettled && !this.waitingForNext) {
            // Settle Check
            // REMOVED old settle check in update override too.
            // Handled by floor collision now.
        }
        return;
    }

    if (this.mode === 'ARCING') {
        const now = Date.now();
        const t = Math.min((now - this.arcStartTime) / this.arcDuration, 1);
        const pos = getBezierPoint(t, this.p0, this.p1, this.p2);

        this.x = pos.x;
        this.y = pos.y;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

        if (t >= 1) {
            startRattle(this);
        }
    }
    else if (this.mode === 'RATTLING') {
        this.vy += 0.12; // Soft Gravity (Restored floaty feel)
        this.x += this.vx;
        this.y += this.vy;

        // DYNAMIC RIM FLOOR
        const targetState = this.targetSide === 'left' ? hoopState.left : hoopState.right;
        const centerX = targetState.x;

        // Raise Rim Floor to "Top of Rim"
        // User requested 0.85 (Deeper in net).
        const rimFloor = targetState.y - (ballSize * 0.85);

        // Floor Collision
        if (this.y > rimFloor) {
            this.y = rimFloor;
            this.rattleBouncesCount++;

            if (this.rattleBouncesCount < this.rattleBouncesTarget) {
                // BOUNCE!
                // Decay bounce height slightly each time
                const decay = 0.6 + (Math.random() * 0.1);
                this.vy *= -decay;

                // Add reduced random jitter x
                this.vx += (Math.random() - 0.5) * 2;

                // Keep strictly centered with strong spring
                // Use stored targetSide
                // FIX: Target X for ball.x should be (centerX - radius)
                const targetBallX = centerX - (ballSize / 2);
                const dist = targetBallX - this.x;
                this.vx += dist * 0.05; // Gentle spring (was 0.2 - harsh wall)
                this.vx *= 0.9;         // Friction to prevent endless ping-pong

            } else {
                // FINISHED BOUNCING
                if (this.willMiss) {
                    // MISS LOGIC: Roll OFF the rim
                    this.mode = 'NORMAL';
                    this.wallsEnabled = true;
                    this.waitingForNext = false;

                    // Random roll direction
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    this.vx = 8 * dir; // Stronger roll (was 5) to clear rim
                    this.vy = -6;      // Higher hop (was -3) to clear rim lip
                } else {
                    // MAKE LOGIC: Drop through net
                    dropThrough(this);
                }
                return;
            }
        }

        // NATURAL Rim Containment
        // centerX defined at top of block

        // FIX: Containment needs to be relative to the Ball's intended center (Top-Left coordinate)
        const targetBallX = centerX - (ballSize / 2);

        if (Math.abs(this.x - targetBallX) > 45) {
            this.vx *= -0.15; // Super soft dampening (almost dead)
            this.x = (this.x < targetBallX) ? targetBallX - 45 : targetBallX + 45;
        }

        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
    else if (this.mode === 'DROPPING') {
        // Standard gravity (Unified)
        this.vy += 0.4 * dtScale;
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;

        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

        // Check if hit floor
        if (this.y + ballSize > window.innerHeight) {
            this.y = window.innerHeight - ballSize;

            if (this === heroBall) {
                // Chaotic bounce for "Makes" too - SIMPLIFIED
                // Just reliable high bounce, no crazy kick
                this.vy *= -0.85;
            } else {
                this.vy *= -0.85;
            }

            // Switch back to normal physics
            this.mode = 'NORMAL';
            this.wallsEnabled = true;

            // Trigger restart timer here too (for makes)
            if (this === heroBall && this.isShooting && !this.waitingForNext) {
                this.waitingForNext = true;
                setTimeout(() => {
                    this.waitingForNext = false;
                    scheduleNextShot(this);
                }, 1500); // 1.5s after hitting ground
            }
        }
    }
}



startShootingSequence();

loop();

// --- DYNAMICALLY INJECT HOOPS ---
(function injectHoops() {
    // Check if hoops already exist to avoid duplicates
    if (document.querySelector('.hoop-container')) return;

    const hoopHTML = `
        <div class="hoop-container left-hoop">
            <div class="backboard">
                <div class="inner-square"></div>
                <div class="rim-connect"></div>
                <div class="rim">
                    <div class="net"></div>
                </div>
            </div>
        </div>
        <div class="hoop-container right-hoop">
            <div class="backboard">
                <div class="inner-square"></div>
                <div class="rim-connect"></div>
                <div class="rim">
                    <div class="net"></div>
                </div>
            </div>
        </div>
    `;

    // Append to body
    const hoopWrapper = document.createElement('div');
    hoopWrapper.innerHTML = hoopHTML;
    document.body.appendChild(hoopWrapper.children[0]);
    document.body.appendChild(hoopWrapper.children[0]); // Append the second one (now at index 0 again)

})();

// --- INJECT HOOP STYLES ---
(function injectHoopStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
    .hoop-container {
        position: fixed;
        top: 30%;
        z-index: 9999;
        width: 140px;
        height: 140px;
        width: 140px;
        height: 140px;
        pointer-events: auto !important; /* Force enable */
        display: block;
        margin: 0 auto;
        transform-origin: top center; 
        cursor: grab; /* Visual cue */
    }

    .left-hoop {
        left: -20px; /* Brought back in from -60px */
        transform-origin: left center;
    }

    .right-hoop {
        right: -40px; /* Move OUT further */
        transform-origin: right center;
    }

    /* Hide Backboard elements */
    .backboard {
        width: 120px;
        height: 90px;
        border: none;
        background-color: transparent;
        position: relative;
        box-shadow: none;
        display: block;
    }

    .inner-square, .rim-connect {
        display: none !important;
    }

    /* Position Rim relative to container since backboard is gone */
    .rim {
        width: 90px;
        height: 18px;
        border: 5px solid black;
        border-radius: 50%;
        position: absolute;
        top: 20px; /* Position where rim would be */
        left: 50%;
        transform: translateX(-50%);
        background: transparent;
        z-index: 2;
    }

    .net {
        width: 70px;
        height: 80px;
        position: absolute;
        top: 10px; /* Moved up slightly per user request (was 18px) */
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
        background: 
            repeating-linear-gradient(60deg, transparent, transparent 4px, black 4px, black 5px),
            repeating-linear-gradient(-60deg, transparent, transparent 4px, black 4px, black 5px);
        clip-path: polygon(0 0, 100% 0, 80% 100%, 20% 100%);
        transform-origin: top center;
        animation: net-sway 3s ease-in-out infinite alternate;
    }

    /* Left Hoop Animation: Face Right */
    @keyframes hoop-float {
        0%, 100% { 
            transform: scale(2.2) rotateY(35deg) translateY(0); 
        }
        50% { 
            /* Subtle sway only, no vertical move */
            transform: scale(2.2) rotateY(35deg) translateY(0); 
        }
    }

    .left-hoop { 
        animation: none !important; /* Disable animation for left hoop drag */
        transform: scale(2.2) rotateY(35deg) translateY(0);
    }

    /* Right Hoop Animation: Face Left. Using rotateY(-35deg) directly. */
    @keyframes hoop-float-right {
        0%, 100% { 
            /* No scaleX(-1) needed if we just rotate oppositely, cleaner for positioning */
            transform: scale(2.2) rotateY(-35deg) translateY(0); 
        }
        50% { 
            /* Subtle sway only, no vertical move */
            transform: scale(2.2) rotateY(-35deg) translateY(0); 
        }
    }
    
    .right-hoop { 
        /* Disable animation for right hoop so dragging is stable */
        animation: none !important; 
        transform: scale(2.2) rotateY(-35deg) translateY(0); /* Static transform */
    }

    @keyframes net-sway {
        0% { transform: translateX(-50%) rotate(1deg) skewX(1deg); }
        100% { transform: translateX(-50%) rotate(-1deg) skewX(-1deg); }
    }

    /* ACTIVE Sway Animation (Triggered on Make) */
    .net.sway {
        animation: activeSway 0.6s ease-out !important;
    }

    @keyframes activeSway {
        0% { transform: translateX(-50%) rotate(0deg) skew(0deg); }
        25% { transform: translateX(-50%) rotate(5deg) skew(-2deg) scaleY(1.05); }
        50% { transform: translateX(-50%) rotate(-3deg) skew(1deg) scaleY(0.95); }
        75% { transform: translateX(-50%) rotate(1deg) skew(0deg); }
        100% { transform: translateX(-50%) rotate(0deg); }
    }
    `;
    document.head.appendChild(style);
})();

// --- DRAGGABLE HOOP LOGIC ---
(function enableDrag() {
    function makeDraggable(element, side) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const rim = element.querySelector('.rim'); // Tracking reference

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get current computed style
            const style = window.getComputedStyle(element);

            // Handle 'right' vs 'left' positioning nuances or convert to fixed 'left/top'
            // To make it simple, we'll switch to 'left' positioning entirely on first drag

            // Use offestLeft (Logical CSS position) to avoid double-counting transforms
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;

            // Force reset to fixed Left/Top to make dragging easier
            element.style.right = 'auto';
            element.style.left = startLeft + 'px';
            element.style.top = startTop + 'px';
            element.style.transform = 'scale(2.2) rotateY(-35deg)'; // Lock transform explicitly

            element.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = (startLeft + dx) + 'px';
            element.style.top = (startTop + dy) + 'px';

            // CRITICAL: Update Physics Engine
            // We use the RIM's position as the truth
            const rimRect = rim.getBoundingClientRect();

            // Center of the rim
            const rimCenterX = rimRect.left + (rimRect.width / 2);
            // "Rim Height" is roughly the top edge or middle. 
            // In our logical model HOOP_Y is roughly "Landing height".
            // Let's use the visual Top of the rim + small offset
            const rimTargetY = rimRect.top;

            if (side === 'right') {
                hoopState.right.x = rimCenterX;
                hoopState.right.y = rimTargetY;
            } else {
                hoopState.left.x = rimCenterX;
                hoopState.left.y = rimTargetY;
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
            }
        });

        // Initial Cursor
        element.style.cursor = 'grab';
    }

    // Wait for DOM
    setTimeout(() => {
        const rightHoop = document.querySelector('.right-hoop');
        if (rightHoop) makeDraggable(rightHoop, 'right');

        const leftHoop = document.querySelector('.left-hoop');
        if (leftHoop) makeDraggable(leftHoop, 'left');
    }, 500); // Small delay to ensure injection
})();

// --- GLOBAL INTERACTIONS ---
document.addEventListener('dblclick', () => {
    console.log("Double click registered, heroBall is: ", heroBall);
    if (heroBall) {
        if (heroBall.isToggledOff) {
            // TURN ON: Pop it up and resume shooting
            heroBall.isToggledOff = false;
            heroBall.mode = 'NORMAL';
            
            // Give it a small pop-up bounce to wake it up visually
            heroBall.vy = -15; 
            heroBall.vx = (Math.random() - 0.5) * 10;
            
            // Shortly after the jump, resume the shooting logic
            setTimeout(() => {
                scheduleNextShot(heroBall);
            }, 300);

        } else {
            // TURN OFF: Freeze and drop
            heroBall.isToggledOff = true;
            heroBall.mode = 'PAUSED';
            heroBall.isShooting = false;
            
            // Wait briefly, then drop straight down
            setTimeout(() => {
                heroBall.mode = 'DROPPING';
                heroBall.vx = 0;
                heroBall.vy = 0;
                heroBall.wallsEnabled = true; // Ensure it bounces/settles on the floor
            }, 300);
        }
    }
});
