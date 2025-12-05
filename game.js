// Jelly Snake 主逻辑（原生 JS + Canvas）
const CONFIG = {
  boardSize: 640,
  baseSpeed: 100,
  speedIncreasePerFood: 1,
  followFactor: 0.1,
  segmentSpacing: 18,
  firstGapMultiplier: 1.6,
  bodyGapMultiplier: 1.15,
  initialSegments: 6,
  maxLength: 90,
  bonusDuration: 7,
  wrapSafeTime: 5,
  mapTransitionDuration: 0.35,
  particleCountRange: [3, 6],
  foodTypes: [
    { type: 'small', radius: 10, score: 1, color: ['#ff9ad7', '#ffd1f2'] },
    { type: 'big', radius: 16, score: 3, color: ['#7ba7ff', '#bfe0ff'] }
  ]
};

const MAP_BUILDERS = {
  plain: () => [],
  map1: (w, h) => buildMatrixObstacles(MAPS.map1, w, h),
  map5: (w, h) => buildMatrixObstacles(MAPS.map5, w, h)
};

const MAPS = {
  map1: [
    [1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0, 1, 0, 1, 0, 1]
  ],
  map5: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]
};

const state = {
  canvas: null,
  ctx: null,
  width: CONFIG.boardSize,
  height: CONFIG.boardSize,
  snake: [],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  speed: CONFIG.baseSpeed,
  score: 0,
  best: 0,
  food: [],
  bonus: null,
  particles: [],
  obstacles: [],
  lastTime: 0,
  lastDt: 0,
  wordHistory: '',
  wordFlash: 0,
  isGameOver: false,
  isPaused: false,
  soundEnabled: true,
  selectedMap: 'plain',
  celebrated: false,
  mapTransition: 0,
  mapMessage: '',
  headImage: null,
  headImageLoaded: false
};

const ui = {};
const pressedKeys = new Set();
const HEAD_RADIUS = 14;
const HEAD_COLOR = { a: '#5fe8ff', b: '#8fffd8' };
const FOOD_COLORS = [
  ['#ff8ad8', '#ffd4f2'],
  ['#ffd36b', '#fff1b2'],
  ['#7ce3ff', '#c7f3ff'],
  ['#9cff8a', '#d9ffd0'],
  ['#c59bff', '#e6d5ff'],
];
const LETTER_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_LIST = [
  // --- 原始/基础词汇 ---
  'CAT', 'DOG', 'SNAKE', 'GAME', 'JELLY', 'APPLE', 'ORANGE',
  'WOW', 'COOL', 'NICE', 'GG', 'WUHU', 'MOYU', 'AA', 'BB',

  // --- 编程与技术 (Tech & Code) ---
  'CODE', 'NODE', 'JAVA', 'PYTHON', 'SWIFT', 'RUST', 'GO', 'JS', 'TS',
  'HTML', 'CSS', 'REACT', 'VUE', 'LINUX', 'UNIX', 'BASH', 'GIT',
  'BUG', 'DEBUG', 'FIX', 'TODO', 'DONE', 'FAIL', 'NULL', 'VOID',
  'TRUE', 'FALSE', 'CONST', 'VAR', 'LET', 'LOOP', 'IF', 'ELSE',
  'API', 'DATA', 'BYTE', 'BIT', 'CLOUD', 'AI', 'GPT', 'LLM',

  // --- 游戏与操作 (Gaming) ---
  'PLAY', 'WIN', 'LOSE', 'OVER', 'START', 'PAUSE', 'EXIT',
  'BOSS', 'HERO', 'ENEMY', 'LEVEL', 'EXP', 'HP', 'MP', 'MANA',
  'BUFF', 'NERF', 'CARRY', 'TANK', 'HEAL', 'AFK', 'LAG', 'PING',
  'NOOB', 'PRO', 'EZ', 'HARD', 'RANK', 'SOLO', 'TEAM', 'RUSH',

  // --- 动物与自然 (Animals) ---
  'LION', 'TIGER', 'BEAR', 'WOLF', 'FOX', 'PIG', 'COW', 'DUCK',
  'BIRD', 'FISH', 'SHARK', 'WHALE', 'PANDA', 'ZEBRA', 'FROG',
  'MOON', 'SUN', 'STAR', 'SKY', 'RAIN', 'WIND', 'SNOW', 'FIRE',

  // --- 食物与水果 (Food) ---
  'BANANA', 'GRAPE', 'LEMON', 'MELON', 'PEAR', 'PEACH', 'PLUM',
  'CAKE', 'PIE', 'CANDY', 'SUGAR', 'SALT', 'RICE', 'MEAT', 'BEEF',
  'SODA', 'COKE', 'TEA', 'MILK', 'WATER', 'BEER', 'PIZZA', 'BURGER',

  // --- 有趣/拼音/拟声词 (Fun/Slang) ---
  'HAHA', 'HEHE', 'XIXI', 'LALA', 'YOYO', 'HEY', 'YEP', 'NOPE',
  'RICH', 'MONEY', 'GOLD', 'LUCK', 'HAPPY', 'SAD', 'ANGRY',
  'XYZ', 'ABC', 'NB', '666', 'SOS', 'OMH', 'OMG', 'WTF'
];

const RIPPLE_CONFIG = {
  spacingBase: 32,
  spacingMin: 26,
  spacingMax: 40,
  headStep: 26,
  tailInterval: 0.35,
  waveSpeed: 320,
  waveFreq: 0.055,
  decay: 0.86,
  maxRadius: 720,
  breatheSpeed: 0.55,
  baseAlpha: 0.45,
  palette: [
    [124, 225, 255],
    [130, 200, 255],
    [160, 140, 255],
    [130, 255, 215],
    [220, 150, 255],
    [255, 180, 210]
  ]
};

const rippleLayer = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  dpr: 1,
  points: [],
  ripples: [],
  lastHeadPos: null,
  headTravel: 0,
  tailCooldown: 0,
  background: null,
  spacing: RIPPLE_CONFIG.spacingBase,
  time: 0
};

function initGame() {
  ui.canvas = document.getElementById('gameCanvas');
  ui.wrapper = document.getElementById('gameWrapper');
  ui.overlay = document.getElementById('gameOverlay');
  ui.overlayScore = document.getElementById('overlayScore');
  ui.overlayBest = document.getElementById('overlayBest');
  ui.score = document.getElementById('score');
  ui.bestScore = document.getElementById('bestScore');
  ui.restartBtns = [document.getElementById('restartBtn'), document.getElementById('restartBtnSecondary')];
  ui.overlayRestart = document.getElementById('overlayRestart');
  ui.overlayResume = document.getElementById('overlayResume');
  ui.soundToggle = document.getElementById('soundToggle');
  ui.joystick = document.getElementById('joystick');
  ui.mapSelect = document.getElementById('mapSelect');
  ui.pauseBtn = document.getElementById('pauseBtn');
  ui.wordCard = document.getElementById('wordCard');
  ui.wordHistory = document.getElementById('wordHistory');
  if (ui.mapSelect) {
    ui.mapSelect.value = state.selectedMap;
  }
  ui.panel = document.querySelector('.panel');
  ui.topbar = document.querySelector('.topbar');
  ui.controls = document.querySelector('.controls-inline');
  state.headImage = new Image();
  state.headImageLoaded = false;
  state.headImage.onload = () => { state.headImageLoaded = true; };
  state.headImage.src = 'maodie.png';

  initRippleLayer();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  state.canvas = ui.canvas;
  state.ctx = ui.canvas.getContext('2d');

  state.best = parseInt(localStorage.getItem('jellySnakeBest') || '0', 10);
  ui.bestScore.textContent = state.best;

  renderWordHistory(true);
  bindControls();
  if (ui.panel) ui.panel.classList.add('panel-ready');
  if (ui.topbar) ui.topbar.classList.add('topbar-ready');
  resetGame();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const w = ui.wrapper.clientWidth;
  const h = ui.wrapper.clientHeight || ui.wrapper.clientWidth;
  state.width = w;
  state.height = h;
  ui.canvas.width = w;
  ui.canvas.height = h;
  updateCanvasRect();
}

function bindControls() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  let touchStart = null;
  ui.canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  ui.canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) + Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? setDirection(1, 0) : setDirection(-1, 0);
    } else {
      dy > 0 ? setDirection(0, 1) : setDirection(0, -1);
    }
    touchStart = null;
  });
  ui.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  ui.joystick.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.dir;
      if (d === 'up') setDirection(0, -1);
      if (d === 'down') setDirection(0, 1);
      if (d === 'left') setDirection(-1, 0);
      if (d === 'right') setDirection(1, 0);
    });
  });

  ui.restartBtns.forEach(btn => btn.addEventListener('click', resetGame));
  ui.overlayRestart.addEventListener('click', () => { resetGame(); hideOverlay(); });
  ui.overlayResume.addEventListener('click', hideOverlay);
  ui.soundToggle.addEventListener('change', () => {
    state.soundEnabled = ui.soundToggle.checked;
  });
  ui.mapSelect.addEventListener('change', (e) => {
    applyMapSelection(e.target.value, e.target);
  });
  ui.pauseBtn.addEventListener('click', togglePause);
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  if (key === 'p' || key === ' ' || key === 'escape') {
    togglePause();
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
    pressedKeys.add(key);
    updateDirectionFromKeys();
  }
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  if (pressedKeys.has(key)) {
    pressedKeys.delete(key);
    updateDirectionFromKeys();
  }
}

function updateDirectionFromKeys() {
  const up = pressedKeys.has('w') || pressedKeys.has('arrowup');
  const down = pressedKeys.has('s') || pressedKeys.has('arrowdown');
  const left = pressedKeys.has('a') || pressedKeys.has('arrowleft');
  const right = pressedKeys.has('d') || pressedKeys.has('arrowright');
  let dx = 0;
  let dy = 0;
  if (left) dx -= 1;
  if (right) dx += 1;
  if (up) dy -= 1;
  if (down) dy += 1;
  if (dx === 0 && dy === 0) return;
  setDirectionNormalized(dx, dy);
}

function setDirectionNormalized(x, y) {
  const mag = Math.hypot(x, y);
  if (mag === 0) return;
  const nx = x / mag;
  const ny = y / mag;
  // 禁止立刻 180° 掉头（用点积判定）
  const dot = nx * state.direction.x + ny * state.direction.y;
  if (dot < -0.95) return;
  state.nextDirection = { x: nx, y: ny };
  headBounce();
}

function resetGame() {
  state.snake = [];
  const startX = state.width / 2;
  const startY = state.height / 2;
  const seedLetters = ['H', 'A', 'J', 'I', 'M', 'I'];
  const initGap = CONFIG.segmentSpacing * CONFIG.firstGapMultiplier;
  // 先放头部在最前
  state.snake.push({
    x: startX,
    y: startY,
    size: 12,
    letter: '',
    colorA: HEAD_COLOR.a, 
    colorB: HEAD_COLOR.b,
    wrapSafe: 0
  });
  // 再放身体字母，首节是 S
  for (let i = 0; i < CONFIG.initialSegments; i++) {
    state.snake.push({
      x: startX - (i + 1) * initGap,
      y: startY,
      size: 12,
      letter: seedLetters[i % seedLetters.length],
      colorA: '#7b8bff',
      colorB: '#ff9ad7',
      wrapSafe: 0
    });
  }
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.speed = CONFIG.baseSpeed;
  state.score = 0;
  state.food = [];
  state.bonus = null;
  state.particles = [];
  state.obstacles = generateMap(state.selectedMap);
  state.isGameOver = false;
  state.isPaused = false;
  state.celebrated = false;
  state.wordFlash = 0;
  ui.score.textContent = '0';
  if (ui.pauseBtn) ui.pauseBtn.textContent = '暂停';
  spawnFood();
  hideOverlay();
}

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  state.lastDt = dt;

  updateRippleLayer(dt);
  if (!state.isPaused) {
    update(dt);
  }
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  state.direction = { ...state.nextDirection };
  const head = state.snake[0];
  head.x += state.direction.x * state.speed * dt;
  head.y += state.direction.y * state.speed * dt;
  // 头部保护衰减
  if (head.wrapSafe > 0) head.wrapSafe = Math.max(0, head.wrapSafe - dt);

  // 身体跟随，制造果冻拖拽
  for (let i = 1; i < state.snake.length; i++) {
    const prev = state.snake[i - 1];
    const seg = state.snake[i];
    seg.x += (prev.x - seg.x) * CONFIG.followFactor;
    seg.y += (prev.y - seg.y) * CONFIG.followFactor;
    // 保持间距：第一节更远，其余稍远
    const desired = CONFIG.segmentSpacing * (i === 1 ? CONFIG.firstGapMultiplier : CONFIG.bodyGapMultiplier);
    let dx = seg.x - prev.x;
    let dy = seg.y - prev.y;
    const dist = Math.hypot(dx, dy);
    if (dist < desired && dist > 0.0001) {
      const k = desired / dist;
      seg.x = prev.x + dx * k;
      seg.y = prev.y + dy * k;
    }
    if (seg.wrapSafe > 0) seg.wrapSafe = Math.max(0, seg.wrapSafe - dt);
  }

  // 单节包裹穿越，更自然
  if (state.selectedMap === 'plain') {
    state.snake.forEach(seg => wrapSegment(seg));
  }

  // 边界 & 自撞
  if (state.selectedMap === 'plain') {
  } else {
    if (head.x < 0 || head.x > state.width || head.y < 0 || head.y > state.height) {
      endGame();
    }
  }
  // 障碍碰撞
  for (const ob of state.obstacles) {
    const dx = ob.x - head.x;
    const dy = ob.y - head.y;
    if (Math.abs(dx) < ob.half && Math.abs(dy) < ob.half && Math.hypot(dx, dy) < ob.half + HEAD_RADIUS * 0.6) {
      endGame();
      return;
    }
  }
  for (let i = 4; i < state.snake.length; i++) {
    const seg = state.snake[i];
    if (seg.wrapSafe > 0 || head.wrapSafe > 0) continue;
    const dx = seg.x - head.x;
    const dy = seg.y - head.y;
    if (Math.hypot(dx, dy) < CONFIG.segmentSpacing * 0.7) {
      endGame();
      break;
    }
  }

  // 食物检测
  state.food.forEach((f, idx) => {
    const dx = f.x - head.x;
    const dy = f.y - head.y;
    const dist = Math.hypot(dx, dy);
    if (dist < f.radius + HEAD_RADIUS) {
      eatFood(idx, f);
    }
  });

  // 奖励球检测
  if (state.bonus) {
    state.bonus.timeLeft -= dt;
    const b = state.bonus;
    const dx = b.x - head.x;
    const dy = b.y - head.y;
    if (Math.hypot(dx, dy) < b.radius + HEAD_RADIUS) {
      eatBonus();
    } else if (b.timeLeft <= 0) {
      state.bonus = null;
    }
  } else if (Math.random() < dt * 0.12) {
    spawnBonus();
  }

  // 粒子
  state.particles = state.particles.filter(p => {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.opacity = Math.max(0, p.life / p.maxLife);
    return true;
  });

  if (state.wordFlash > 0) {
    state.wordFlash = Math.max(0, state.wordFlash - dt);
  }
  trackSnakeRipples(dt);
}

function eatFood(idx, food) {
  state.food.splice(idx, 1);
  // 增长
  for (let i = 0; i < (food.type === 'big' ? 2 : 1); i++) {
    const tail = state.snake[state.snake.length - 1];
    state.snake.push({
      x: tail.x,
      y: tail.y,
      size: 12,
      letter: food.letter,
      colorA: food.color[0],
      colorB: food.color[1],
      wrapSafe: CONFIG.wrapSafeTime
    });
  }
  state.score += food.score;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('jellySnakeBest', state.best);
    ui.bestScore.textContent = state.best;
    ui.bestScore.classList.add('best-flash');
    setTimeout(() => ui.bestScore.classList.remove('best-flash'), 240);
  }
  ui.score.textContent = state.score;
  scoreBounce();

  state.speed = CONFIG.baseSpeed + state.snake.length * CONFIG.speedIncreasePerFood;

  checkWordsOnSnake();
  addRippleAtGamePos(food.x, food.y, 1.05);
  spawnAbsorbEffect(food);
  spawnParticles(food);
  playPop();
  if (state.snake.length >= CONFIG.maxLength && !state.celebrated) {
    triggerCelebrate();
    state.celebrated = true;
  }
  spawnFood();
}

function spawnFood() {
  const margin = 30;
  const desired = 3;
  while (state.food.length < desired) {
    const availableLetters = LETTER_POOL.filter(l => !state.food.some(f => f.letter === l));
    const letter = availableLetters.length ? availableLetters[randInt(0, availableLetters.length - 1)] : LETTER_POOL[randInt(0, LETTER_POOL.length - 1)];
    const type = Math.random() < 0.25 ? CONFIG.foodTypes[1] : CONFIG.foodTypes[0];
    let x, y;
    let safe = false;
    for (let t = 0; t < 60 && !safe; t++) {
      x = margin + Math.random() * (state.width - margin * 2);
      y = margin + Math.random() * (state.height - margin * 2);
      const clearSnake = state.snake.every(seg => Math.hypot(seg.x - x, seg.y - y) > CONFIG.segmentSpacing * 2);
      const clearObs = state.obstacles.every(ob => {
        const safeRadius = (ob.half || ob.radius || 12) + type.radius + 10;
        return Math.hypot(ob.x - x, ob.y - y) > safeRadius;
      });
      safe = clearSnake && clearObs;
    }
    const colors = FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)];
    state.food.push({ ...type, x, y, pulse: 0, letter, color: colors });
  }
}

function spawnBonus() {
  const margin = 40;
  let x, y;
  let safe = false;
  for (let t = 0; t < 60 && !safe; t++) {
    x = margin + Math.random() * (state.width - margin * 2);
    y = margin + Math.random() * (state.height - margin * 2);
    const clearSnake = state.snake.every(seg => Math.hypot(seg.x - x, seg.y - y) > CONFIG.segmentSpacing * 2.2);
    const clearObs = state.obstacles.every(ob => Math.hypot(ob.x - x, ob.y - y) > ob.half + 20);
    safe = clearSnake && clearObs;
  }
  state.bonus = {
    x, y,
    radius: 14,
    timeLeft: CONFIG.bonusDuration,
    colorA: 'rgba(126,237,255,0.35)',
    colorB: 'rgba(255,165,255,0.45)'
  };
}

function eatBonus() {
  state.score += 5;
  ui.score.textContent = state.score;
  scoreBounce();
  state.speed += 30;
  triggerCelebrate();
  addRippleAtGamePos(state.snake[0].x, state.snake[0].y, 1.2);
  playPop();
  state.bonus = null;
}

function spawnParticles(food) {
  const count = randInt(CONFIG.particleCountRange[0], CONFIG.particleCountRange[1]);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 80;
    state.particles.push({
      x: food.x,
      y: food.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4 + Math.random() * 4,
      color: food.color[0],
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9
    });
  }
}

function spawnAbsorbEffect(food) {
  // 让食物向蛇头飞缩
  const head = state.snake[0];
  const fx = food.x;
  const fy = food.y;
  const duration = 180;
  const start = performance.now();
  const animate = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const x = lerp(fx, head.x, easeOutCubic(t));
    const y = lerp(fy, head.y, easeOutCubic(t));
    const r = lerp(food.radius, 2, t);
    const ctx = state.ctx;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    grad.addColorStop(0, food.color[1]);
    grad.addColorStop(1, food.color[0]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (t < 1 && !state.isGameOver) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function render() {
  const ctx = state.ctx;
  ctx.clearRect(0, 0, state.width, state.height);

  // 背景柔光
  const bgGrad = ctx.createLinearGradient(0, 0, state.width, state.height);
  bgGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
  bgGrad.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, state.width, state.height);

  renderObstacles(ctx);
  renderFood(ctx);
  renderBonus(ctx);
  renderSnake(ctx);
  renderParticles(ctx);
}

function renderBonus(ctx) {
  if (!state.bonus) return;
  const b = state.bonus;
  const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.05;
  const r = b.radius * pulse;
  const grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.2, b.x, b.y, r);
  grad.addColorStop(0, b.colorB);
  grad.addColorStop(1, b.colorA);
  ctx.save();
  ctx.shadowColor = 'rgba(130,255,255,0.4)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();

  // 进度环
  const progress = Math.max(0, b.timeLeft / CONFIG.bonusDuration);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffffcc';
  ctx.beginPath();
  ctx.arc(b.x, b.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.restore();
}

function renderObstacles(ctx) {
  const time = performance.now() * 0.004;
  state.obstacles.forEach(ob => {
    const wobble = 1 + Math.sin(time + ob.pulse) * 0.05;
    const half = ob.half * wobble;
    const size = half * 2;
    const grad = ctx.createLinearGradient(ob.x - half, ob.y - half, ob.x + half, ob.y + half);
    grad.addColorStop(0, '#2d1a55');
    grad.addColorStop(1, '#4a2d86');
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = 'rgba(70,40,130,0.45)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = grad;
    roundRect(ctx, ob.x - half, ob.y - half, size, size, 6);
    ctx.fill();
    ctx.restore();
  });

  // 过渡计时
  if (state.mapTransition > 0) {
    state.mapTransition = Math.max(0, state.mapTransition - (state.lastDt || 0));
  }
}

function renderFood(ctx) {
  state.food.forEach(f => {
    f.pulse += 0.02;
    const r = f.radius * (1 + Math.sin(f.pulse) * 0.05);
    drawLetter(ctx, f.letter, f.x, f.y, r, f.color);
  });
}

function renderSnake(ctx) {
  const time = performance.now() * 0.006;
  const flashAlpha = state.wordFlash > 0 ? Math.min(1, state.wordFlash / 0.25) : 0;
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const seg = state.snake[i];
    const wobble = Math.sin(time + i * 0.6) * 0.6;
    const size = HEAD_RADIUS + wobble + (i === 0 ? 1.5 : -0.5);
    const colorA = i === 0 ? HEAD_COLOR.a : (seg.colorA || '#7b8bff');
    const colorB = i === 0 ? HEAD_COLOR.b : (seg.colorB || '#ff9ad7');
    if (i === 0) {
      drawHead(ctx, seg.x, seg.y, size, [colorA, colorB]);
    } else {
      drawLetter(ctx, seg.letter || 'A', seg.x, seg.y, size, [colorA, colorB]);
    }
    if (flashAlpha > 0) {
      const glowR = size + 6;
      const g = ctx.createRadialGradient(seg.x, seg.y, glowR * 0.25, seg.x, seg.y, glowR);
      g.addColorStop(0, `rgba(255,255,255,${0.4 * flashAlpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(seg.x - glowR, seg.y - glowR, glowR * 2, glowR * 2);
      ctx.restore();
    }
  }
  // 头部高光
  const head = state.snake[0];
  const headSize = HEAD_RADIUS + 6;
  ctx.save();

  ctx.beginPath();
 
  ctx.restore();

  // 头部保护进度圈
  if (head.wrapSafe && head.wrapSafe > 0) {
    const progress = Math.min(1, head.wrapSafe / CONFIG.wrapSafeTime);
    const r = HEAD_RADIUS + 10;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(head.x, head.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }


}

function renderParticles(ctx) {
  state.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function headBounce() {
  // 已去除按键边框跳动效果，保持安静视觉
}

function scoreBounce() {
  ui.score.classList.add('score-pulse');
  setTimeout(() => ui.score.classList.remove('score-pulse'), 220);
}

function endGame() {
  if (state.isGameOver) return;
  state.isGameOver = true;
  state.isPaused = true;
  ui.overlayScore.textContent = `本局得分：${state.score}`;
  ui.overlayBest.textContent = `历史最高：${state.best}`;
  ui.overlay.classList.remove('hidden');
  playDrop();
}

function hideOverlay() {
  ui.overlay.classList.add('hidden');
  state.isPaused = false;
  state.isGameOver = false;
}

function generateMap(key) {
  const builder = MAP_BUILDERS[key] || MAP_BUILDERS.plain;
  const obs = builder(state.width, state.height);
  // 避开初始出生区
  return obs.filter(o => Math.hypot(o.x - state.width / 2, o.y - state.height / 2) > 120);
}

function applyMapSelection(mapKey, selectEl) {
  const key = MAP_BUILDERS[mapKey] ? mapKey : 'plain';
  state.selectedMap = key;
  if (ui.mapSelect && ui.mapSelect.value !== key) {
    ui.mapSelect.value = key;
  }
  state.obstacles = generateMap(key);
  state.food = [];
  state.bonus = null;
  spawnFood();
  state.snake.forEach(seg => { seg.wrapSafe = CONFIG.wrapSafeTime; });
  const label = selectEl && selectEl.options ? (selectEl.options[selectEl.selectedIndex]?.text || '') : '';
  triggerMapTransition(label ? `已切换到「${label}」` : '');
}

function triggerMapTransition(message = '') {
  state.mapMessage = message;
  state.mapTransition = CONFIG.mapTransitionDuration;
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// 简易音效：使用 Web Audio 生成短促啵啵
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playPop() {
  if (!state.soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}
function playDrop() {
  if (!state.soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.32);
}

function triggerCelebrate() {
  ui.wrapper.classList.add('celebrate-glow');
  setTimeout(() => ui.wrapper.classList.remove('celebrate-glow'), 1200);
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24;
    const speed = 160 + Math.random() * 80;
    state.particles.push({
      x: state.snake[0].x,
      y: state.snake[0].y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4 + Math.random() * 3,
      color: i % 2 ? '#ff9ad7' : '#7ba7ff',
      life: 0.9,
      maxLife: 1.1,
      opacity: 1
    });
  }
}

function buildMatrixObstacles(matrix, w, h) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const cellW = w / cols;
  const cellH = h / rows;
  const size = Math.min(cellW, cellH) * 0.7;
  const half = size / 2;
  const list = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === 1) {
        const x = c * cellW + cellW / 2;
        const y = r * cellH + cellH / 2;
        list.push({ x, y, half, pulse: Math.random() * Math.PI });
      }
    }
  }
  return list;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapSegment(seg) {
  const m = CONFIG.segmentSpacing;
  let wrapped = false;
  if (seg.x < -m) { seg.x += state.width + m * 2; wrapped = true; }
  if (seg.x > state.width + m) { seg.x -= state.width + m * 2; wrapped = true; }
  if (seg.y < -m) { seg.y += state.height + m * 2; wrapped = true; }
  if (seg.y > state.height + m) { seg.y -= state.height + m * 2; wrapped = true; }
  if (wrapped) {
    seg.wrapSafe = CONFIG.wrapSafeTime;
    // 如果是头部穿越，给整条蛇一个保护时间，避免立即自撞
    if (seg === state.snake[0]) {
      state.snake.forEach(s => { s.wrapSafe = CONFIG.wrapSafeTime; });
    }
  }
}

function drawShape(ctx, shape, x, y, r, colors) {
  const [c1, c2] = colors;
  ctx.save();
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  grad.addColorStop(0, c2);
  grad.addColorStop(1, c1);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 10;
  switch (shape) {
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.9, y + r * 0.75);
      ctx.lineTo(x - r * 0.9, y + r * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    case 'square':
      roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 0.35);
      ctx.fill();
      break;
    case 'pentagon':
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'cross': {
      const w = r * 0.55;
      ctx.beginPath();
      roundRect(ctx, x - w, y - r, w * 2, r * 2, w * 0.45);
      ctx.fill();
      roundRect(ctx, x - r, y - w, r * 2, w * 2, w * 0.45);
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

function drawHead(ctx, x, y, r, colors) {
  if (state.headImageLoaded) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(state.headImage, x - (r + 2), y - (r + 2), (r + 2) * 2, (r + 2) * 2);
    ctx.restore();
    return;
  }
  drawShape(ctx, 'circle', x, y, r, colors);
}

function drawLetter(ctx, letter, x, y, r, colors) {
  const [c1, c2] = colors;
  ctx.save();
  ctx.font = `${r * 1.7}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // glow layer
  ctx.fillStyle = c2;
  ctx.globalAlpha = 0.6;
  ctx.shadowColor = c2;
  ctx.shadowBlur = r * 1.2;
  ctx.fillText(letter, x, y);
  // main letter
  ctx.globalAlpha = 1;
  ctx.shadowColor = c1;
  ctx.shadowBlur = r * 0.8;
  ctx.fillStyle = c1;
  ctx.fillText(letter, x, y);
  ctx.restore();
}

function checkWordsOnSnake() {
  if (!state.snake.length) return;
  const letters = state.snake.map(seg => (seg.letter || '').toUpperCase()).join('');
  if (!letters) return;
  const found = [];
  const seen = new Set();
  for (const w of WORD_LIST) {
    if (letters.includes(w) && !seen.has(w)) {
      found.push(w);
      seen.add(w);
    }
  }
  if (!found.length) return;
  state.wordFlash = 0.25;
  found.forEach(w => { state.wordHistory += `${w} `; });
  renderWordHistory();
  flashWordPanel();
}

function renderWordHistory(initial = false) {
  if (!ui.wordHistory) return;
  ui.wordHistory.textContent = state.wordHistory.trim();
  if (!initial) {
    ui.wordHistory.scrollTo({ top: ui.wordHistory.scrollHeight, behavior: 'smooth' });
  } else {
    ui.wordHistory.scrollTop = ui.wordHistory.scrollHeight;
  }
}

function flashWordPanel() {
  if (!ui.wordHistory) return;
  ui.wordHistory.classList.add('word-flash');
  setTimeout(() => ui.wordHistory && ui.wordHistory.classList.remove('word-flash'), 260);
}

function initRippleLayer() {
  const canvas = document.getElementById('rippleCanvas');
  if (!canvas) return;
  rippleLayer.canvas = canvas;
  rippleLayer.ctx = canvas.getContext('2d');
  resizeRippleCanvas();
  buildRipplePoints();
  // 预热一次中心波纹，进入页面即有轻微律动
  setTimeout(() => addRippleAtGamePos(state.width / 2, state.height / 2, 0.35), 180);
  window.addEventListener('resize', () => {
    resizeRippleCanvas();
    buildRipplePoints();
  });
}

function resizeRippleCanvas() {
  if (!rippleLayer.canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  rippleLayer.width = w;
  rippleLayer.height = h;
  rippleLayer.dpr = window.devicePixelRatio || 1;
  rippleLayer.canvas.style.width = `${w}px`;
  rippleLayer.canvas.style.height = `${h}px`;
  rippleLayer.canvas.width = Math.floor(w * rippleLayer.dpr);
  rippleLayer.canvas.height = Math.floor(h * rippleLayer.dpr);
  rippleLayer.ctx.setTransform(rippleLayer.dpr, 0, 0, rippleLayer.dpr, 0, 0);
  rippleLayer.background = rippleLayer.ctx.createLinearGradient(0, 0, w, h);
  rippleLayer.background.addColorStop(0, 'rgba(6, 14, 30, 0.9)');
  rippleLayer.background.addColorStop(1, 'rgba(8, 16, 36, 0.92)');
  rippleLayer.spacing = Math.max(
    RIPPLE_CONFIG.spacingMin,
    Math.min(RIPPLE_CONFIG.spacingMax, Math.round(Math.min(w, h) / 22))
  );
  updateCanvasRect();
}

function buildRipplePoints() {
  if (!rippleLayer.canvas) return;
  rippleLayer.points = [];
  const s = rippleLayer.spacing || RIPPLE_CONFIG.spacingBase;
  for (let y = -s; y <= rippleLayer.height + s; y += s) {
    for (let x = -s; x <= rippleLayer.width + s; x += s) {
      rippleLayer.points.push({
        x,
        y,
        base: 0.32 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: RIPPLE_CONFIG.palette[randInt(0, RIPPLE_CONFIG.palette.length - 1)]
      });
    }
  }
}

function updateCanvasRect() {
  if (!ui.canvas) return;
  rippleLayer.lastRect = ui.canvas.getBoundingClientRect();
}

function mapGameToRipple(x, y) {
  if (!rippleLayer.ctx || !ui.canvas) return null;
  if (!rippleLayer.lastRect) updateCanvasRect();
  const rect = rippleLayer.lastRect;
  return {
    x: rect.left + (x / state.width) * rect.width,
    y: rect.top + (y / state.height) * rect.height
  };
}

function addRippleAtGamePos(x, y, strength = 1) {
  const pos = mapGameToRipple(x, y);
  if (!pos) return;
  rippleLayer.ripples.push({
    x: pos.x,
    y: pos.y,
    radius: 0,
    strength,
    speed: RIPPLE_CONFIG.waveSpeed + Math.random() * 80
  });
  if (rippleLayer.ripples.length > 18) rippleLayer.ripples.shift();
}

function updateRippleLayer(dt) {
  if (!rippleLayer.ctx) return;
  rippleLayer.time += dt;
  rippleLayer.ripples = rippleLayer.ripples.filter(r => {
    r.radius += (r.speed || RIPPLE_CONFIG.waveSpeed) * dt;
    r.strength *= RIPPLE_CONFIG.decay;
    return r.strength > 0.02 && r.radius < RIPPLE_CONFIG.maxRadius;
  });
  // 偶发环境波纹，保持轻微流动感
  if (Math.random() < dt * 0.25) {
    const rx = Math.random() * rippleLayer.width;
    const ry = Math.random() * rippleLayer.height;
    rippleLayer.ripples.push({
      x: rx,
      y: ry,
      radius: 0,
      strength: 0.18,
      speed: RIPPLE_CONFIG.waveSpeed * 0.85
    });
  }
  renderRippleLayer();
}

function renderRippleLayer() {
  const ctx = rippleLayer.ctx;
  const w = rippleLayer.width;
  const h = rippleLayer.height;
  if (!ctx) return;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rippleLayer.background || '#050915';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(140, 215, 255, 0.25)';
  const t = rippleLayer.time;
  const freq = RIPPLE_CONFIG.waveFreq;
  for (let i = 0; i < rippleLayer.points.length; i++) {
    const p = rippleLayer.points[i];
    let offsetX = 0;
    let offsetY = 0;
    let rippleBoost = 0;
    for (let j = 0; j < rippleLayer.ripples.length; j++) {
      const r = rippleLayer.ripples[j];
      const dx = p.x - r.x;
      const dy = p.y - r.y;
      const dist = Math.hypot(dx, dy) || 1;
      const diff = dist - r.radius;
      const wave = Math.sin(diff * freq) * r.strength * Math.exp(-Math.abs(diff) * 0.012);
      offsetX += (dx / dist) * wave * 8;
      offsetY += (dy / dist) * wave * 8;
      rippleBoost += wave * 0.6;
    }
    const breathe = 1 + Math.sin(t * RIPPLE_CONFIG.breatheSpeed + p.phase) * 0.12;
    const alpha = Math.max(0, Math.min(1, (p.base * breathe + rippleBoost + 0.08) * RIPPLE_CONFIG.baseAlpha));
    if (alpha < 0.02) continue;
    const px = p.x + offsetX;
    const py = p.y + offsetY;
    const color = p.color;
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function trackSnakeRipples(dt) {
  if (!state.snake.length) return;
  const head = state.snake[0];
  if (rippleLayer.lastHeadPos) {
    rippleLayer.headTravel += Math.hypot(head.x - rippleLayer.lastHeadPos.x, head.y - rippleLayer.lastHeadPos.y);
  }
  rippleLayer.lastHeadPos = { x: head.x, y: head.y };
  if (rippleLayer.headTravel > RIPPLE_CONFIG.headStep) {
    addRippleAtGamePos(head.x, head.y, 0.75);
    rippleLayer.headTravel = 0;
  }
  rippleLayer.tailCooldown = Math.max(0, rippleLayer.tailCooldown - dt);
  if (rippleLayer.tailCooldown <= 0 && state.snake.length > 4) {
    const idx = Math.min(state.snake.length - 1, 3 + Math.floor(Math.random() * 5));
    const seg = state.snake[idx];
    addRippleAtGamePos(seg.x, seg.y, 0.35);
    rippleLayer.tailCooldown = RIPPLE_CONFIG.tailInterval;
  }
}


function togglePause() {
  if (state.isGameOver) return;
  state.isPaused = !state.isPaused;
  if (ui.pauseBtn) ui.pauseBtn.textContent = state.isPaused ? '继续' : '暂停';
  if (ui.pauseBtn) {
    ui.pauseBtn.classList.add('btn-pulse');
    setTimeout(() => ui.pauseBtn.classList.remove('btn-pulse'), 200);
  }
  if (ui.controls) {
    ui.controls.classList.toggle('controls-dim', state.isPaused);
  }
}

window.addEventListener('click', () => {
  // 激活音频上下文以兼容移动端
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

window.addEventListener('load', initGame);

