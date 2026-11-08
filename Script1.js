const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

// ELEMENTOS HTML
const scoreUI = document.getElementById("score");
const recordUI = document.getElementById("record");
const finalScore = document.getElementById("finalScore");

const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");
const fpsDisplay = document.getElementById("fpsDisplay");
const fpsUI = document.getElementById("fps");
const controlsHint = document.getElementById("controlsHint");
const mobileControls = document.getElementById("mobileControls");
const superChargeFill = document.getElementById("superChargeFill");
const superChargeText = document.getElementById("superChargeText");

const mainMenu = document.getElementById("mainMenu");
const optionsMenu = document.getElementById("optionsMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const musicMenu = document.getElementById("musicMenu");
const leaderboardMenu = document.getElementById("leaderboardMenu");
const upgradesMenu = document.getElementById("upgradesMenu");
const upgradeScore = document.getElementById("upgradeScore");
const doubleShotTitle = document.getElementById("doubleShotTitle");
const doubleShotLevel = document.getElementById("doubleShotLevel");
const doubleShotCost = document.getElementById("doubleShotCost");
const doubleShotBtn = document.getElementById("doubleShotBtn");
const rapidFireLevel = document.getElementById("rapidFireLevel");
const rapidFireCost = document.getElementById("rapidFireCost");
const rapidFireBtn = document.getElementById("rapidFireBtn");
const shipSpeedLevel = document.getElementById("shipSpeedLevel");
const shipSpeedCost = document.getElementById("shipSpeedCost");
const shipSpeedBtn = document.getElementById("shipSpeedBtn");
const superChargeCost = document.getElementById("superChargeCost");
const superChargeBtn = document.getElementById("superChargeBtn");

const music = document.getElementById("music");
const volume = document.getElementById("volume");
const musicBtn = document.getElementById("musicBtn");
const musicEnabled = document.getElementById("musicEnabled");
const showFps = document.getElementById("showFps");
const showControls = document.getElementById("showControls");
const transparentUi = document.getElementById("transparentUi");
const motionBlur = document.getElementById("motionBlur");
const musicTrack = document.getElementById("musicTrack");
const musicPlayBtn = document.getElementById("musicPlayBtn");
const musicStopBtn = document.getElementById("musicStopBtn");
const nowPlaying = document.getElementById("nowPlaying");
const leaderboardPeriod = document.getElementById("leaderboardPeriod");
const leaderboardTitle = document.getElementById("leaderboardTitle");
const periodLeaderboardUI = document.getElementById("periodLeaderboard");
const currentScoreComparison = document.getElementById("currentScoreComparison");
const playerNameInput = document.getElementById("playerName");
const playerCountry = document.getElementById("playerCountry");
const saveRecordBtn = document.getElementById("saveRecordBtn");
const leaderboardUI = document.getElementById("leaderboard");

// VARIABLES
let keys = {};
let player, enemy;

let asteroids = [];
let bullets = [];
let playerBullets = [];
let particles = [];
let stars = [];
let boss = null;
let bossMinions = [];

let score = 0;
let leaderboard = loadLeaderboard();
let record = Math.max(
    Number(localStorage.getItem("alienRecord")) || 0,
    leaderboard[0]?.score || 0
);

let running = false;
let lastTime = 0;
let asteroidTimer = 0;
let enemyShotTimer = 0;
let bossSpawnTimer = 0;
let bossShotTimer = 0;
let nextBossScore = 300;
let playerShootTimer = 0;
let fpsElapsed = 0;
let fpsFrames = 0;
let animationId = null;
let audioContext = null;
let musicIsEnabled = localStorage.getItem("alienMusicEnabled") !== "false";
let showFpsEnabled = localStorage.getItem("alienShowFps") !== "false";
let showControlsEnabled = localStorage.getItem("alienShowControls") !== "false";
let transparentUiEnabled = localStorage.getItem("alienTransparentUi") === "true";
let motionBlurEnabled = localStorage.getItem("alienMotionBlur") === "true";
let lastDisplayedScore = null;
let lastUpgradeState = "";
let lastSuperChargeState = "";
let upgrades = {
    doubleShot: 0,
    rapidFire: 0,
    shipSpeed: 0,
    superCharge: false
};
let superCharge = 0;
let superBeamTimer = 0;
const musicTracks = [
    { title: "Menu Theme", src: "music/menu-theme.mp3" }
];
let currentTrackIndex = Number(localStorage.getItem("alienMusicTrack")) || 0;

if (!musicTracks[currentTrackIndex]) currentTrackIndex = 0;

function updateDiscordActivity(activity) {
    if (window.alienEscapeDesktop?.isDesktop) {
        window.alienEscapeDesktop.updateDiscord(activity);
    }
}

musicEnabled.checked = musicIsEnabled;
showFps.checked = showFpsEnabled;
showControls.checked = showControlsEnabled;
transparentUi.checked = transparentUiEnabled;
motionBlur.checked = motionBlurEnabled;

function applyInterfacePreferences() {
    fpsDisplay.classList.toggle("hidden", !showFpsEnabled);
    controlsHint.classList.toggle("hidden", !showControlsEnabled);
    mobileControls.classList.toggle("hidden", !showControlsEnabled);
    document.body.classList.toggle("transparent-ui", transparentUiEnabled);
}

function updateFps(dt) {
    fpsElapsed += dt;
    fpsFrames++;

    if (fpsElapsed >= 0.5) {
        fpsUI.textContent = Math.round(fpsFrames / fpsElapsed);
        fpsElapsed = 0;
        fpsFrames = 0;
    }
}

applyInterfacePreferences();

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}

function playSound(type) {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const settings = {
        shoot: { start: 520, end: 150, duration: 0.09, volume: 0.08 },
        asteroid: { start: 180, end: 70, duration: 0.18, volume: 0.12 },
        alien: { start: 720, end: 90, duration: 0.35, volume: 0.14 }
    }[type];

    oscillator.type = type === "alien" ? "sawtooth" : "square";
    oscillator.frequency.setValueAtTime(settings.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    gain.gain.setValueAtTime(settings.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
}

recordUI.textContent = record;

// CONTROLES
document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "q") activateSuperBeam();

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
    }

    const key = e.key.toLowerCase();

    if ((key === "x" || e.key === " ") && running && !e.repeat) {
        e.preventDefault();
        playerShoot();
        playerShootTimer = 0;
    }
});

document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

document.querySelectorAll("[data-mobile-key]").forEach(button => {
    const key = button.dataset.mobileKey;

    const press = event => {
        event.preventDefault();
        keys[key] = true;
        if (key === "x" && running) {
            playerShoot();
            playerShootTimer = 0;
        }
    };

    const release = event => {
        event.preventDefault();
        keys[key] = false;
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
});

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function getDifficultyLevel() {
    return Math.min(10, Math.floor((Number.isFinite(score) ? score : 0) / 100));
}

function getDifficultySettings() {
    const level = getDifficultyLevel();

    return {
        level,
        asteroidSpeedBonus: level * 0.7,
        asteroidInterval: Math.max(0.1, 0.28 - level * 0.018),
        enemySpeed: 2.8 + level * 0.42,
        enemyShotInterval: Math.max(0.24, 1.05 - level * 0.075),
        raySpeed: 4.5 + level * 0.85,
        raySize: 4 + level * 0.8,
        rayCount: level >= 5 ? 3 : level >= 3 ? 2 : 1,
        alienPoints: level >= 3 ? 4 : 3
    };
}

// ESTRELLAS
function createStars() {
    stars = [];

    for (let i = 0; i < 65; i++) {
        stars.push({
            x: random(0, W),
            y: random(0, H),
            speed: random(0.5, 3),
            size: random(1, 2)
        });
    }
}

// JUGADOR
function drawPlayer(x, y) {
    ctx.fillStyle = "#123c78";
    ctx.fillRect(x - 14, y + 1, 28, 12);
    ctx.fillRect(x - 8, y - 11, 16, 20);
    ctx.fillStyle = "#1de0ef";
    ctx.fillRect(x - 4, y - 19, 8, 24);
    ctx.fillRect(x - 18, y + 6, 8, 7);
    ctx.fillRect(x + 10, y + 6, 8, 7);
    ctx.fillStyle = "#8affff";
    ctx.fillRect(x - 3, y - 14, 6, 7);
    ctx.fillStyle = "#ffcf4a";
    ctx.fillRect(x - 10, y + 3, 5, 4);
    ctx.fillRect(x + 5, y + 3, 5, 4);
    ctx.fillStyle = "#ff7043";
    ctx.fillRect(x - 4, y + 14, 8, 7);
}

// ENEMIGO
function drawEnemy(x, y) {
    ctx.fillStyle = "#30145c";
    ctx.fillRect(x - 16, y - 6, 32, 18);
    ctx.fillRect(x - 23, y + 1, 7, 9);
    ctx.fillRect(x + 16, y + 1, 7, 9);
    ctx.fillStyle = "#b833d4";
    ctx.fillRect(x - 12, y - 11, 24, 7);
    ctx.fillRect(x - 12, y + 8, 24, 6);
    ctx.fillStyle = "#ff4f8b";
    ctx.fillRect(x - 9, y - 3, 6, 6);
    ctx.fillRect(x + 3, y - 3, 6, 6);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 7, y + 5, 14, 3);
}

function drawBoss(b) {
    ctx.fillStyle = "#24113e";
    ctx.fillRect(b.x - 45, b.y - 18, 90, 30);
    ctx.fillRect(b.x - 58, b.y - 5, 13, 19);
    ctx.fillRect(b.x + 45, b.y - 5, 13, 19);
    ctx.fillStyle = "#7d2bb7";
    ctx.fillRect(b.x - 36, b.y - 26, 72, 10);
    ctx.fillRect(b.x - 32, b.y + 10, 64, 8);
    ctx.fillStyle = "#ff315c";
    ctx.fillRect(b.x - 24, b.y - 13, 12, 9);
    ctx.fillRect(b.x + 12, b.y - 13, 12, 9);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(b.x - 8, b.y - 6, 16, 5);
    ctx.fillStyle = "#2be7e0";
    ctx.fillRect(b.x - 50, b.y + 1, 7, 6);
    ctx.fillRect(b.x + 43, b.y + 1, 7, 6);

    ctx.fillStyle = "#371044";
    ctx.fillRect(b.x - 42, b.y - 31, 84, 6);
    ctx.fillStyle = "#ffca55";
    ctx.fillRect(b.x - 42, b.y - 31, 84 * (b.health / b.maxHealth), 6);
}

// METEORITOS
function createAsteroid() {
    const size = random(7, 13);
    const settings = getDifficultySettings();
    const dangerous = settings.level > 0 && Math.random() < Math.min(0.12 + settings.level * 0.045, 0.45);

    asteroids.push({
        x: random(size, W - size),
        y: -20,
        size,
        dangerous,
        value: dangerous ? 3 : 2,
        type: "meteor",
        speed: random(3.5, 6.5) + settings.asteroidSpeedBonus +
            (dangerous ? 1.8 + settings.level * 0.2 : 0)
    });
}

function createSpaceJunk() {
    if (score < 400) return;

    const size = random(5, 10);
    asteroids.push({
        x: random(size, W - size),
        y: -20,
        size,
        dangerous: false,
        value: 1,
        type: "junk",
        speed: random(2.5, 5.2) + getDifficultySettings().asteroidSpeedBonus
    });
}

function drawAsteroid(a) {
    ctx.fillStyle = a.type === "junk" ? "#4e3025" : a.dangerous ? "#84351d" : "#343b52";

    ctx.fillRect(
        a.x - a.size,
        a.y - a.size / 2,
        a.size * 2,
        a.size
    );

    ctx.fillRect(
        a.x - a.size / 2,
        a.y - a.size,
        a.size,
        a.size * 2
    );

    ctx.fillStyle = a.type === "junk" ? "#d8874b" : a.dangerous ? "#ff9b45" : "#8290aa";
    ctx.fillRect(a.x - 4, a.y - 3, 6, 5);
    ctx.fillStyle = a.type === "junk" ? "#e8b05d" : "#c2d0e6";
    ctx.fillRect(a.x - a.size / 2, a.y - a.size / 2, 4, 3);

    if (a.type === "junk") {
        ctx.fillStyle = "#d8a15d";
        ctx.fillRect(a.x - 2, a.y - a.size - 2, 4, 4);
    }
}

function addSuperCharge(amount) {
    if (!upgrades.superCharge) return;
    superCharge = Math.min(100, superCharge + amount);
}

function activateSuperBeam() {
    if (!running || !upgrades.superCharge || superCharge < 100 || superBeamTimer > 0) return;
    superCharge = 0;
    superBeamTimer = 0.55;
    playerBullets.push({
        x: player.x,
        y: player.y - 180,
        vx: 0,
        vy: 0,
        superBeam: true,
        damage: 12
    });
    playSound("alien");
}

function updateSuperChargeUI() {
    const percent = Math.round(superCharge);
    const state = `${upgrades.superCharge}:${percent}`;
    if (lastSuperChargeState === state) return;
    lastSuperChargeState = state;
    superChargeFill.style.width = `${percent}%`;
    superChargeText.textContent = upgrades.superCharge
        ? `SUPERCARGA Q ${percent}%`
        : "SUPERCARGA: COMPRA POR 300";
}

// EXPLOSIONES
function explosion(x, y, color) {
    for (let i = 0; i < 14; i++) {
        particles.push({
            x,
            y,
            vx: random(-3, 3),
            vy: random(-3, 3),
            life: 1,
            color
        });
    }

    if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function updateParticles(dt) {
    for (const p of particles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt * 1.8;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    }

    ctx.globalAlpha = 1;

    particles = particles.filter(p => p.life > 0);
}

// DISPAROS
function shootFrom(shooter) {
    const settings = getDifficultySettings();
    const dx = player.x - shooter.x;
    const dy = player.y - shooter.y;

    const baseAngle = Math.atan2(dy, dx);
    const spread = settings.rayCount === 1 ? [0] : settings.rayCount === 2 ? [-0.1, 0.1] : [-0.14, 0, 0.14];

    spread.forEach(angleOffset => {
        const angle = baseAngle + angleOffset;

        bullets.push({
            x: shooter.x,
            y: shooter.y,
            vx: Math.cos(angle) * settings.raySpeed,
            vy: Math.sin(angle) * settings.raySpeed,
            size: settings.raySize
        });
    });

    playSound("shoot");
}

function shoot() {
    shootFrom(enemy);
}

function spawnBoss() {
    const health = 20 + getDifficultyLevel() * 5;

    boss = {
        x: W / 2,
        y: 58,
        speed: 1.5 + getDifficultyLevel() * 0.15,
        direction: 1,
        health,
        maxHealth: health
    };
    bossMinions = [];
    superCharge = 0;
    superBeamTimer = 0;
    bossSpawnTimer = 0;
    bossShotTimer = 0;
    explosion(boss.x, boss.y, "#a800ff");
}

function spawnBossMinion() {
    if (!boss || bossMinions.length >= 4) return;

    bossMinions.push({
        x: boss.x + random(-35, 35),
        y: boss.y + 25,
        speed: getDifficultySettings().enemySpeed + 0.4,
        value: 3
    });
}

function playerShoot() {
    const offsets = upgrades.doubleShot >= 3
        ? [-12, -4, 4, 12]
        : upgrades.doubleShot >= 2
        ? [-8, 0, 8]
        : upgrades.doubleShot === 1
            ? [-6, 6]
            : [0];

    offsets.forEach(offset => {
        playerBullets.push({
            x: player.x + offset,
            y: player.y - 20,
            vx: 0,
            vy: -7
        });
    });
    playSound("shoot");
}

function getUpgradeCost(type) {
    if (type === "doubleShot") return 50 + upgrades.doubleShot * 75;
    if (type === "shipSpeed") return 80 + upgrades.shipSpeed * 60;
    if (type === "superCharge") return 300;
    return 40 + upgrades.rapidFire * 30;
}

function updateUpgradeUI() {
    const state = `${score}:${upgrades.doubleShot}:${upgrades.rapidFire}:${upgrades.shipSpeed}:${upgrades.superCharge}`;
    if (lastUpgradeState === state) return;
    lastUpgradeState = state;
    upgradeScore.textContent = Math.max(0, score);
    doubleShotLevel.textContent = upgrades.doubleShot;
    rapidFireLevel.textContent = upgrades.rapidFire;
    shipSpeedLevel.textContent = upgrades.shipSpeed;
    shipSpeedCost.textContent = getUpgradeCost("shipSpeed");
    superChargeCost.textContent = getUpgradeCost("superCharge");
    doubleShotCost.textContent = getUpgradeCost("doubleShot");
    rapidFireCost.textContent = getUpgradeCost("rapidFire");

    doubleShotBtn.disabled = upgrades.doubleShot >= 3 || score < getUpgradeCost("doubleShot");
    rapidFireBtn.disabled = upgrades.rapidFire >= 6 || score < getUpgradeCost("rapidFire");
    shipSpeedBtn.disabled = upgrades.shipSpeed >= 3 || score < getUpgradeCost("shipSpeed");
    superChargeBtn.disabled = upgrades.superCharge || score < getUpgradeCost("superCharge");

    doubleShotTitle.textContent = upgrades.doubleShot >= 3 ? "DISPARO CUÁDRUPLE" : upgrades.doubleShot >= 2 ? "DISPARO TRIPLE" : "DISPARO DOBLE";
    doubleShotBtn.textContent = upgrades.doubleShot === 0
        ? "COMPRAR DOBLE"
        : upgrades.doubleShot === 1
            ? "COMPRAR TRIPLE"
        : upgrades.doubleShot === 2
            ? "COMPRAR CUÁDRUPLE"
            : "MÁXIMO";
    rapidFireBtn.textContent = upgrades.rapidFire >= 6 ? "MÁXIMO" : "COMPRAR";
    shipSpeedBtn.textContent = upgrades.shipSpeed >= 3 ? "MÁXIMO" : "COMPRAR";
    superChargeBtn.textContent = upgrades.superCharge ? "ACTIVADA" : "COMPRAR";
}

function buyUpgrade(type) {
    const cost = getUpgradeCost(type);
    const maxLevel = type === "doubleShot" ? 3 : type === "rapidFire" ? 6 : type === "shipSpeed" ? 3 : 1;

    if (upgrades[type] >= maxLevel || score < cost) return;

    score -= cost;
    upgrades[type]++;
    if (type === "superCharge") superCharge = 0;
    updateScoreUI();
    updateUpgradeUI();
    updateSuperChargeUI();
}

function updateScoreUI() {
    if (lastDisplayedScore === score) return;
    scoreUI.textContent = score;
    lastDisplayedScore = score;
}

// COLISIONES
function collision(a, b, distance) {
    return Math.hypot(a.x - b.x, a.y - b.y) < distance;
}

// ==================================
// INICIAR JUEGO
// ==================================

function startGame() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    player = {
        x: W / 2,
        y: H - 65,
        speed: 4.5
    };

    enemy = {
        x: W / 2,
        y: 40,
        speed: 2.8,
        value: 3
    };

    asteroids = [];
    bullets = [];
    playerBullets = [];
    particles = [];
    boss = null;
    bossMinions = [];

    score = 0;
    lastUpgradeState = "";
    lastSuperChargeState = "";

    asteroidTimer = 0;
    enemyShotTimer = 0;
    bossSpawnTimer = 0;
    bossShotTimer = 0;
    nextBossScore = 300;
    playerShootTimer = 0;
    fpsElapsed = 0;
    fpsFrames = 0;
    fpsUI.textContent = "0";

    lastDisplayedScore = null;
    updateScoreUI();
    updateUpgradeUI();

    createStars();

    running = true;
    updateDiscordActivity({
        details: "Sobreviviendo en el espacio",
        state: "Puntuación: 0",
        startTimestamp: Date.now()
    });

    mainMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    musicMenu.classList.add("hidden");
    leaderboardMenu.classList.add("hidden");

    overlay.classList.add("hidden");
    hud.classList.remove("hidden");

    lastTime = performance.now();

    animationId = requestAnimationFrame(loop);
}

// ==================================
// GAME OVER
// ==================================

function gameOver() {
    if (!running) return;

    running = false;
    updateDiscordActivity({
        details: "La nave ha sido destruida",
        state: `Puntuación final: ${score}`
    });

    explosion(player.x, player.y, "#00eaff");

    if (score > record) {
        record = score;

        localStorage.setItem("alienRecord", record);

        recordUI.textContent = record;
    }

    finalScore.textContent = score;
    updateUpgradeUI();
    document.getElementById("gameOverRecord").textContent = record;
    playerNameInput.value = localStorage.getItem("alienPlayerName") || "";
    playerCountry.value = localStorage.getItem("alienPlayerCountry") || "🌐";
    saveRecordBtn.disabled = false;
    saveRecordBtn.textContent = "GUARDAR RÉCORD";

    hud.classList.add("hidden");

    overlay.classList.remove("hidden");

    mainMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.remove("hidden");
    musicMenu.classList.add("hidden");
    leaderboardMenu.classList.add("hidden");

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ==================================
// ACTUALIZAR JUEGO
// ==================================

function update(dt) {
    const step = dt * 60;
    updateFps(dt);
    superBeamTimer = Math.max(0, superBeamTimer - dt);
    player.speed = 4.5 + upgrades.shipSpeed * 1.2;

    if (keys["x"] || keys[" "]) {
        playerShootTimer += dt;
        const fireInterval = Math.max(0.12, 0.45 - upgrades.rapidFire * 0.055);

        if (playerShootTimer >= fireInterval) {
            playerShoot();
            playerShootTimer = 0;
        }
    } else {
        playerShootTimer = 0;
    }

    // MOVIMIENTO JUGADOR
    if (keys["arrowleft"] || keys["a"])
        player.x -= player.speed * step;

    if (keys["arrowright"] || keys["d"])
        player.x += player.speed * step;

    if (keys["arrowup"] || keys["w"])
        player.y -= player.speed * step;

    if (keys["arrowdown"] || keys["s"])
        player.y += player.speed * step;

    player.x = Math.max(12, Math.min(W - 12, player.x));
    player.y = Math.max(18, Math.min(H - 18, player.y));

    // MOVIMIENTO ENEMIGO
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;

    const distance = Math.hypot(dx, dy) || 1;
    const settings = getDifficultySettings();

    if (!boss && score >= nextBossScore) {
        spawnBoss();
        nextBossScore += 300;
    }

    enemy.speed = settings.enemySpeed;
    enemy.value = settings.alienPoints;
    enemy.x += dx / distance * enemy.speed * step;
    enemy.y += dy / distance * enemy.speed * step;

    // DISPAROS ENEMIGOS
    enemyShotTimer += dt;

    if (enemyShotTimer > settings.enemyShotInterval) {
        shoot();
        enemyShotTimer = 0;
    }

    if (boss) {
        boss.x += boss.speed * boss.direction * step;

        if (boss.x < 60 || boss.x > W - 60) boss.direction *= -1;

        bossSpawnTimer += dt;
        bossShotTimer += dt;

        if (bossSpawnTimer > 2.2) {
            spawnBossMinion();
            bossSpawnTimer = 0;
        }

        if (bossShotTimer > Math.max(0.55, settings.enemyShotInterval + 0.2)) {
            bossMinions.forEach(shooter => shootFrom(shooter));
            bossShotTimer = 0;
        }
    }

    for (const minion of bossMinions) {
        const minionDx = player.x - minion.x;
        const minionDy = player.y - minion.y;
        const minionDistance = Math.hypot(minionDx, minionDy) || 1;

        minion.x += minionDx / minionDistance * minion.speed * step;
        minion.y += minionDy / minionDistance * minion.speed * step;

        if (collision(player, minion, 20)) {
            gameOver();
            return;
        }
    }

    // METEORITOS
    asteroidTimer += dt;

    if (asteroidTimer > settings.asteroidInterval) {
        createAsteroid();
        if (score >= 400 && Math.random() < 0.35) createSpaceJunk();
        asteroidTimer = 0;
    }

    // RAYOS ENEMIGOS
    for (const b of bullets) {
        b.x += b.vx * step;
        b.y += b.vy * step;

        if (collision(player, b, 14 + b.size)) {
            gameOver();
            return;
        }
    }

    bullets = bullets.filter(b =>
        b.x > -20 &&
        b.x < W + 20 &&
        b.y > -20 &&
        b.y < H + 20
    );

    for (const a of asteroids) {
        a.y += a.speed * step;

        if (collision(player, a, a.size + 7)) {
            gameOver();
            return;
        }
    }

    asteroids = asteroids.filter(a => a.y < H + 30);

    // DISPAROS DEL JUGADOR
    for (const b of playerBullets) {
        if (b.superBeam) {
            if (boss && Math.abs(b.x - boss.x) < 48) {
                boss.health -= b.damage;
                b.hit = true;
                explosion(b.x, boss.y, "#00eaff");
            }

            for (let i = asteroids.length - 1; i >= 0; i--) {
                if (Math.abs(b.x - asteroids[i].x) < 18) {
                    score += asteroids[i].value;
                    addSuperCharge(asteroids[i].type === "junk" ? 1 : 2);
                    explosion(asteroids[i].x, asteroids[i].y, "#00eaff");
                    asteroids.splice(i, 1);
                    b.hit = true;
                }
            }

            if (boss && boss.health <= 0) {
                score += 100;
                addSuperCharge(100);
                explosion(boss.x, boss.y, "#ffca55");
                boss = null;
                bossMinions = [];
            }

            continue;
        }

        b.x += b.vx * step;
        b.y += b.vy * step;

        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];

            if (collision(b, asteroid, asteroid.size + 4)) {
                asteroids.splice(i, 1);
                b.hit = true;
                score += Number.isFinite(asteroid.value) ? asteroid.value : 2;
                addSuperCharge(asteroid.type === "junk" ? 1 : 2);
                explosion(asteroid.x, asteroid.y, "#ffca55");
                playSound("asteroid");
                break;
            }
        }

        if (!b.hit && boss && collision(b, boss, 42)) {
            b.hit = true;
            boss.health--;
            explosion(b.x, b.y, "#a800ff");

            if (boss.health <= 0) {
                score += 100;
                addSuperCharge(100);
                explosion(boss.x, boss.y, "#ffca55");
                boss = null;
                bossMinions = [];
            }
        }

        for (let i = bossMinions.length - 1; i >= 0 && !b.hit; i--) {
            if (collision(b, bossMinions[i], 20)) {
                b.hit = true;
                score += bossMinions[i].value;
                addSuperCharge(12);
                explosion(bossMinions[i].x, bossMinions[i].y, "#ff1744");
                bossMinions.splice(i, 1);
            }
        }

        if (!b.hit && collision(b, enemy, 20)) {
            b.hit = true;
            score += enemy.value;
            addSuperCharge(25);
            explosion(enemy.x, enemy.y, "#ff1744");
            playSound("alien");
            enemy.x = random(25, W - 25);
            enemy.y = 40;
        }
    }

    playerBullets = playerBullets.filter(b =>
        !b.hit &&
        b.x > -10 &&
        b.x < W + 10 &&
        b.y > -10 &&
        b.y < H + 10
    );

    // COLISIÓN ENEMIGO
    if (collision(player, enemy, 24)) {
        gameOver();
        return;
    }

    // ESTRELLAS
    stars.forEach(s => {
        s.y += s.speed * step;

        if (s.y > H) {
            s.y = 0;
            s.x = random(0, W);
        }
    });

    // PUNTUACIÓN
    score += Math.floor(step);

    updateScoreUI();
    updateUpgradeUI();
    updateSuperChargeUI();
}

// ==================================
// DIBUJAR
// ==================================

function draw(dt) {
    if (motionBlurEnabled) {
        ctx.fillStyle = "rgba(8, 8, 23, 0.34)";
    } else {
        ctx.fillStyle = "#080817";
    }
    ctx.fillRect(0, 0, W, H);

    // ESTRELLAS
    ctx.fillStyle = "#a6a6df";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // METEORITOS
    asteroids.forEach(drawAsteroid);

    // BALAS
    ctx.fillStyle = "#ff355e";
    bullets.forEach(b => {
        ctx.fillRect(b.x - b.size / 2, b.y - b.size, b.size, b.size * 2);
    });

    ctx.fillStyle = "#00eaff";
    playerBullets.forEach(b => {
        if (b.superBeam) {
            ctx.fillStyle = "#00eaffaa";
            ctx.fillRect(b.x - 18, 0, 36, player.y);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(b.x - 5, 0, 10, player.y);
        } else {
            ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
        }
    });

    if (boss) drawBoss(boss);
    bossMinions.forEach(minion => drawEnemy(minion.x, minion.y));

    // NAVES
    drawEnemy(enemy.x, enemy.y);
    drawPlayer(player.x, player.y);

    // PARTÍCULAS
    updateParticles(dt);
}

// ==================================
// BUCLE PRINCIPAL
// ==================================

function loop(now) {
    if (!running) return;

    const dt = Math.min((now - lastTime) / 1000, 0.035);

    lastTime = now;

    update(dt);

    if (!running) return;

    draw(dt);

    animationId = requestAnimationFrame(loop);
}

// ==================================
// MENÚ PRINCIPAL
// ==================================

function showMenu() {
    running = false;
    updateDiscordActivity({
        details: "Preparándose para despegar",
        state: "En el menú principal",
        startTimestamp: Date.now()
    });

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    mainMenu.classList.remove("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    upgradesMenu.classList.add("hidden");

    overlay.classList.remove("hidden");
    hud.classList.add("hidden");

    keys = {};
}

function showOptions() {
    mainMenu.classList.add("hidden");
    optionsMenu.classList.remove("hidden");
    gameOverMenu.classList.add("hidden");
    musicMenu.classList.add("hidden");
    leaderboardMenu.classList.add("hidden");
    upgradesMenu.classList.add("hidden");
}

function backToMenu() {
    optionsMenu.classList.add("hidden");
    upgradesMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
}

function showUpgrades() {
    mainMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    musicMenu.classList.add("hidden");
    leaderboardMenu.classList.add("hidden");
    upgradesMenu.classList.remove("hidden");
    updateUpgradeUI();
}

function showMusic() {
    mainMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    leaderboardMenu.classList.add("hidden");
    upgradesMenu.classList.add("hidden");
    musicMenu.classList.remove("hidden");
}

function showLeaderboard() {
    mainMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    musicMenu.classList.add("hidden");
    upgradesMenu.classList.add("hidden");
    leaderboardMenu.classList.remove("hidden");
    renderPeriodLeaderboard(leaderboardPeriod.value);
}

// ==================================
// MÚSICA
// ==================================

function renderMusicTracks() {
    musicTrack.innerHTML = musicTracks.map((track, index) =>
        `<option value="${index}">${escapeHtml(track.title)}</option>`
    ).join("");
    musicTrack.value = String(currentTrackIndex);
    nowPlaying.textContent = musicTracks[currentTrackIndex].title;
}

function playMusic() {
    if (!musicIsEnabled) return Promise.resolve();

    return music.play().then(() => {
        musicPlayBtn.textContent = "Ⅱ PAUSAR";
    }).catch(error => {
        musicPlayBtn.textContent = "▶ REPRODUCIR";
        console.log("Error al reproducir música:", error);
    });
}

function stopMusic() {
    music.pause();
    musicPlayBtn.textContent = "▶ REPRODUCIR";
}

function changeMusicTrack() {
    const wasPlaying = !music.paused;
    currentTrackIndex = Number(musicTrack.value);
    localStorage.setItem("alienMusicTrack", String(currentTrackIndex));
    music.src = musicTracks[currentTrackIndex].src;
    nowPlaying.textContent = musicTracks[currentTrackIndex].title;
    music.load();

    if (wasPlaying && musicIsEnabled) playMusic();
}

musicBtn.onclick = showMusic;

musicPlayBtn.onclick = () => {
    if (music.paused) {
        playMusic();
    } else {
        music.pause();
        musicPlayBtn.textContent = "▶ REPRODUCIR";
    }
};

musicStopBtn.onclick = stopMusic;
musicTrack.onchange = changeMusicTrack;

musicEnabled.onchange = () => {
    musicIsEnabled = musicEnabled.checked;
    localStorage.setItem("alienMusicEnabled", String(musicIsEnabled));

    if (musicIsEnabled) {
        playMusic();
    } else {
        stopMusic();
    }
};

showFps.onchange = () => {
    showFpsEnabled = showFps.checked;
    localStorage.setItem("alienShowFps", String(showFpsEnabled));
    applyInterfacePreferences();
};

motionBlur.onchange = () => {
    motionBlurEnabled = motionBlur.checked;
    localStorage.setItem("alienMotionBlur", String(motionBlurEnabled));
};

showControls.onchange = () => {
    showControlsEnabled = showControls.checked;
    localStorage.setItem("alienShowControls", String(showControlsEnabled));
    applyInterfacePreferences();
};

transparentUi.onchange = () => {
    transparentUiEnabled = transparentUi.checked;
    localStorage.setItem("alienTransparentUi", String(transparentUiEnabled));
    applyInterfacePreferences();
};

volume.oninput = () => {
    music.volume = Number(volume.value) / 100;
    document.getElementById("volumeValue").textContent = volume.value + "%";
};

// ==================================
// TABLA DE RÉCORDS
// ==================================

function loadLeaderboard() {
    try {
        const saved = JSON.parse(localStorage.getItem("alienLeaderboard") || "[]");

        if (!Array.isArray(saved)) return [];

        return saved
            .filter(entry => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
            .map(entry => ({
                name: entry.name.trim().slice(0, 16) || "JUGADOR",
                score: Math.floor(Number(entry.score)),
                country: typeof entry.country === "string" ? entry.country : "🌐",
                createdAt: Number(entry.createdAt) || Date.now()
            }))
            .sort((a, b) => b.score - a.score);
    } catch {
        return [];
    }
}

function escapeHtml(value) {
    return value.replace(/[&<>\"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[character]));
}

function getPeriodStart(period) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === "week") {
        const day = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - day);
    } else if (period === "month") {
        start.setDate(1);
    } else if (period === "year") {
        start.setMonth(0, 1);
    }

    return start.getTime();
}

function getPeriodLabel(period) {
    return {
        day: "CALIFICACIÓN DEL DÍA",
        week: "CALIFICACIÓN DE LA SEMANA",
        month: "CALIFICACIÓN DEL MES",
        year: "CALIFICACIÓN DEL AÑO",
        all: "CALIFICACIÓN HISTÓRICA"
    }[period] || "CALIFICACIÓN DEL DÍA";
}

function getLeaderboardEntries(period) {
    const entries = period === "all"
        ? leaderboard
        : leaderboard.filter(entry => entry.createdAt >= getPeriodStart(period));

    return [...entries].sort((a, b) => b.score - a.score);
}

function renderLeaderboardEntries(element, entries, emptyMessage) {
    element.innerHTML = entries.length
        ? entries.map(entry => `
            <li>
                <span class="leaderboard-entry">
                    <span class="leaderboard-player">
                        <span class="leaderboard-flag">${escapeHtml(entry.country)}</span>
                        <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
                    </span>
                    <b class="leaderboard-score">${entry.score}</b>
                </span>
            </li>`).join("")
        : `<li class="empty-leaderboard">${emptyMessage}</li>`;
}

function renderLeaderboard() {
    renderLeaderboardEntries(
        leaderboardUI,
        getLeaderboardEntries("all").slice(0, 5),
        "Sin récords todavía"
    );
}

function renderPeriodLeaderboard(period) {
    const entries = getLeaderboardEntries(period);
    leaderboardTitle.textContent = getPeriodLabel(period);
    currentScoreComparison.textContent = `${score} puntos · Mejor: ${record}`;
    renderLeaderboardEntries(
        periodLeaderboardUI,
        entries.slice(0, 10),
        "Sin puntuaciones en este periodo"
    );
}

function saveScore() {
    const name = playerNameInput.value.trim().slice(0, 16) || "JUGADOR";

    leaderboard.push({
        name,
        score,
        country: playerCountry.value,
        createdAt: Date.now()
    });
    leaderboard.sort((a, b) => b.score - a.score);

    localStorage.setItem("alienLeaderboard", JSON.stringify(leaderboard));
    localStorage.setItem("alienPlayerName", name);
    localStorage.setItem("alienPlayerCountry", playerCountry.value);

    record = leaderboard[0]?.score || 0;
    localStorage.setItem("alienRecord", record);
    recordUI.textContent = record;
    document.getElementById("gameOverRecord").textContent = record;

    renderLeaderboard();
    renderPeriodLeaderboard(leaderboardPeriod.value);
    saveRecordBtn.disabled = true;
    saveRecordBtn.textContent = "RÉCORD GUARDADO";
}

// ==================================
// BOTONES
// ==================================

document.getElementById("startBtn").onclick = () => {
    if (musicIsEnabled) playMusic();
    getAudioContext();
    startGame();
};

document.getElementById("optionsBtn").onclick = showOptions;

document.getElementById("upgradesBtn").onclick = showUpgrades;

document.getElementById("leaderboardBtn").onclick = showLeaderboard;

document.getElementById("backBtn").onclick = backToMenu;

document.getElementById("musicBackBtn").onclick = backToMenu;

document.getElementById("upgradesBackBtn").onclick = backToMenu;

document.getElementById("leaderboardBackBtn").onclick = backToMenu;

leaderboardPeriod.onchange = () => renderPeriodLeaderboard(leaderboardPeriod.value);

document.getElementById("restartBtn").onclick = startGame;

document.getElementById("menuBtn").onclick = showMenu;

document.getElementById("exitBtn").onclick = () => {
    window.close();
};

saveRecordBtn.onclick = saveScore;

doubleShotBtn.onclick = () => buyUpgrade("doubleShot");
rapidFireBtn.onclick = () => buyUpgrade("rapidFire");
shipSpeedBtn.onclick = () => buyUpgrade("shipSpeed");
superChargeBtn.onclick = () => buyUpgrade("superCharge");
document.getElementById("gameOverUpgradesBtn").onclick = showUpgrades;

// ==================================
// INICIALIZACIÓN
// ==================================

music.volume = Number(volume.value) / 100;
music.muted = !musicIsEnabled;
music.src = musicTracks[currentTrackIndex].src;
playerCountry.value = localStorage.getItem("alienPlayerCountry") || "🌐";
renderMusicTracks();
musicPlayBtn.textContent = music.paused ? "▶ REPRODUCIR" : "Ⅱ PAUSAR";
renderLeaderboard();
renderPeriodLeaderboard(leaderboardPeriod.value);

if (window.spotifyPlayer) {
    window.spotifyPlayer.start();
}

mainMenu.classList.remove("hidden");
optionsMenu.classList.add("hidden");
gameOverMenu.classList.add("hidden");
musicMenu.classList.add("hidden");
leaderboardMenu.classList.add("hidden");
upgradesMenu.classList.add("hidden");

updateUpgradeUI();

overlay.classList.remove("hidden");
hud.classList.add("hidden");