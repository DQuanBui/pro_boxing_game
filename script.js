(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');

  const UI = {
    playerName: $('playerName'),
    playerRecord: $('playerRecord'),
    enemyName: $('enemyName'),
    enemyRecord: $('enemyRecord'),
    playerHealthBar: $('playerHealthBar'),
    playerStaminaBar: $('playerStaminaBar'),
    playerPowerBar: $('playerPowerBar'),
    enemyHealthBar: $('enemyHealthBar'),
    enemyStaminaBar: $('enemyStaminaBar'),
    enemyPowerBar: $('enemyPowerBar'),
    roundLabel: $('roundLabel'),
    timerLabel: $('timerLabel'),
    messageLabel: $('messageLabel'),
    comboLabel: $('comboLabel'),
    comboText: $('comboText'),
    mainMenu: $('mainMenu'),
    pauseMenu: $('pauseMenu'),
    resultMenu: $('resultMenu'),
    resultEyebrow: $('resultEyebrow'),
    resultTitle: $('resultTitle'),
    resultCopy: $('resultCopy'),
    scorecards: $('scorecards'),
    soundToggle: $('soundToggle'),
    pauseBtn: $('pauseBtn'),
    startBtn: $('startBtn'),
    trainingBtn: $('trainingBtn'),
    resumeBtn: $('resumeBtn'),
    restartBtn: $('restartBtn'),
    menuBtn: $('menuBtn'),
    againBtn: $('againBtn'),
    resultMenuBtn: $('resultMenuBtn'),
    nameInput: $('nameInput'),
    difficultySelect: $('difficultySelect'),
    roundsSelect: $('roundsSelect'),
    timeSelect: $('timeSelect'),
    careerTitle: $('careerTitle'),
    careerRecord: $('careerRecord'),
    careerLevel: $('careerLevel'),
    careerCash: $('careerCash'),
    careerKos: $('careerKos'),
    careerXpBar: $('careerXpBar'),
    careerXpText: $('careerXpText'),
    resetCareerBtn: $('resetCareerBtn')
  };

  const W = 1280;
  const H = 720;
  const FLOOR_Y = 560;
  const RING_LEFT = 130;
  const RING_RIGHT = 1150;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => Math.random() * (max - min) + min;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const PUNCHES = {
    jab: {
      label: 'Jab', wind: 0.07, active: 0.08, recover: 0.16, cost: 7, damage: 4.5, guardDamage: 1.1,
      staminaDamage: 5, range: 94, width: 56, height: 38, y: -132, score: 8, powerGain: 6, sound: 330
    },
    cross: {
      label: 'Cross', wind: 0.11, active: 0.09, recover: 0.24, cost: 12, damage: 8.5, guardDamage: 2.3,
      staminaDamage: 9, range: 104, width: 64, height: 42, y: -126, score: 15, powerGain: 10, sound: 250
    },
    hook: {
      label: 'Hook', wind: 0.16, active: 0.11, recover: 0.31, cost: 16, damage: 11.5, guardDamage: 3.4,
      staminaDamage: 12, range: 82, width: 76, height: 52, y: -116, score: 22, powerGain: 13, sound: 210
    },
    uppercut: {
      label: 'Uppercut', wind: 0.18, active: 0.10, recover: 0.34, cost: 18, damage: 13.5, guardDamage: 4.1,
      staminaDamage: 14, range: 70, width: 60, height: 70, y: -98, score: 26, powerGain: 15, sound: 190
    },
    power: {
      label: 'Power Shot', wind: 0.22, active: 0.12, recover: 0.42, cost: 24, damage: 20, guardDamage: 7,
      staminaDamage: 22, range: 105, width: 84, height: 58, y: -122, score: 45, powerGain: 0, sound: 130, requiresPower: true
    }
  };

  const CareerStore = {
  load() {
    const data = window.MBC_DATA;
    const fallback = data.createDefaultCareer();

    try {
      const raw = localStorage.getItem(data.storageKey);
      if (!raw) return fallback;

      const saved = JSON.parse(raw);
      return {
        ...fallback,
        ...saved,
        upgrades: {
          ...fallback.upgrades,
          ...(saved.upgrades || {})
        }
      };
    } catch {
      return fallback;
    }
  },

  save(career) {
    localStorage.setItem(window.MBC_DATA.storageKey, JSON.stringify(career));
  },

  reset() {
    const fresh = window.MBC_DATA.createDefaultCareer();
    this.save(fresh);
    return fresh;
  },

  addXP(career, xp) {
    career.xp += xp;

    let needed = window.MBC_DATA.xpToNextLevel(career.level);

    while (career.xp >= needed) {
      career.xp -= needed;
      career.level += 1;
      career.cash += 100;
      needed = window.MBC_DATA.xpToNextLevel(career.level);
    }
  }
};

  const DIFFICULTY = {
    rookie: { label: 'Rookie', aiRate: 0.72, aiDefense: 0.42, aiPower: 0.86, aiStamina: 0.9, getUp: 0.58 },
    contender: { label: 'Contender', aiRate: 1, aiDefense: 0.66, aiPower: 1, aiStamina: 1, getUp: 0.72 },
    champion: { label: 'Champion', aiRate: 1.25, aiDefense: 0.84, aiPower: 1.12, aiStamina: 1.12, getUp: 0.82 }
  };

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.justPressed = new Set();
      this.bind();
    }

    bind() {
      window.addEventListener('keydown', (e) => {
        const code = e.code;
        if ([
          'ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space', 'ShiftLeft', 'ShiftRight',
          'KeyA', 'KeyD', 'KeyS', 'KeyJ', 'KeyK', 'KeyL', 'KeyI', 'KeyF', 'KeyP', 'Escape'
        ].includes(code)) {
          e.preventDefault();
        }
        if (!this.keys.has(code)) this.justPressed.add(code);
        this.keys.add(code);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });

      document.querySelectorAll('[data-hold]').forEach((button) => {
        const action = button.dataset.hold;
        const code = this.mobileCode(action);
        const start = (e) => {
          e.preventDefault();
          this.keys.add(code);
        };
        const end = (e) => {
          e.preventDefault();
          this.keys.delete(code);
        };
        button.addEventListener('pointerdown', start);
        button.addEventListener('pointerup', end);
        button.addEventListener('pointercancel', end);
        button.addEventListener('pointerleave', end);
      });

      document.querySelectorAll('[data-tap]').forEach((button) => {
        const action = button.dataset.tap;
        const code = this.mobileCode(action);
        button.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.justPressed.add(code);
          this.keys.add(code);
          window.setTimeout(() => this.keys.delete(code), 90);
        });
      });
    }

    mobileCode(action) {
      return {
        left: 'KeyA', right: 'KeyD', block: 'ShiftLeft', jab: 'KeyJ', cross: 'KeyK',
        hook: 'KeyL', uppercut: 'KeyI', dodge: 'KeyS', power: 'KeyF'
      }[action] || 'Space';
    }

    pressed(...codes) {
      return codes.some((code) => this.keys.has(code));
    }

    tapped(...codes) {
      return codes.some((code) => this.justPressed.has(code));
    }

    endFrame() {
      this.justPressed.clear();
    }
  }

  class AudioEngine {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.master = null;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    setEnabled(value) {
      this.enabled = value;
      UI.soundToggle.textContent = value ? 'Sound On' : 'Sound Off';
    }

    tone(freq, duration = 0.08, type = 'sine', gain = 0.16) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    noise(duration = 0.12, gain = 0.12) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      source.start(now);
      source.stop(now + duration);
    }

    punch(freq) {
      this.tone(freq, 0.07, 'square', 0.08);
    }

    hit(heavy = false) {
      this.noise(heavy ? 0.18 : 0.1, heavy ? 0.22 : 0.12);
      this.tone(heavy ? 88 : 120, heavy ? 0.14 : 0.08, 'sawtooth', heavy ? 0.1 : 0.06);
    }

    bell() {
      this.tone(880, 0.22, 'sine', 0.18);
      window.setTimeout(() => this.tone(660, 0.25, 'sine', 0.16), 180);
    }
  }

  class Particle {
    constructor(x, y, vx, vy, life, radius, color, type = 'circle') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.life = life;
      this.maxLife = life;
      this.radius = radius;
      this.color = color;
      this.type = type;
      this.rotation = rand(0, Math.PI * 2);
      this.spin = rand(-4, 4);
    }

    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 520 * dt;
      this.rotation += this.spin * dt;
    }

    draw(ctx) {
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      if (this.type === 'spark') {
        ctx.fillRect(-this.radius * 1.8, -this.radius * 0.25, this.radius * 3.6, this.radius * 0.5);
      } else if (this.type === 'text') {
        ctx.font = `900 ${this.radius}px Inter, system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(this.color, 0, 0);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class Fighter {
    constructor(config) {
      this.name = config.name;
      this.corner = config.corner;
      this.x = config.x;
      this.y = FLOOR_Y;
      this.vx = 0;
      this.facing = config.facing;
      this.color = config.color;
      this.trim = config.trim;
      this.skin = config.skin;
      this.glove = config.glove;
      this.isPlayer = config.isPlayer;
      this.ai = config.ai || null;
      this.resetFight();
    }

    resetFight() {
      this.health = 100;
      this.stamina = 100;
      this.power = 0;
      this.score = 0;
      this.roundScore = 0;
      this.damageDoneRound = 0;
      this.cleanHitsRound = 0;
      this.knockdowns = 0;
      this.roundKnockdowns = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.state = 'idle';
      this.stateTime = 0;
      this.punch = null;
      this.hasHit = false;
      this.blocking = false;
      this.dodgeTimer = 0;
      this.stun = 0;
      this.flash = 0;
      this.getupMeter = 0;
      this.ko = false;
      this.breath = rand(0, 10);
      this.stepPhase = 0;
      this.guardOpen = 0;
      this.lastHitBy = null;
      this.x = this.corner === 'blue' ? 360 : 920;
      this.facing = this.corner === 'blue' ? 1 : -1;
    }

    resetRound() {
      this.health = clamp(this.health + 18, 24, 100);
      this.stamina = 100;
      this.roundScore = 0;
      this.damageDoneRound = 0;
      this.cleanHitsRound = 0;
      this.roundKnockdowns = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.state = 'idle';
      this.stateTime = 0;
      this.punch = null;
      this.hasHit = false;
      this.blocking = false;
      this.dodgeTimer = 0;
      this.stun = 0;
      this.flash = 0;
      this.getupMeter = 0;
      this.x = this.corner === 'blue' ? 360 : 920;
      this.facing = this.corner === 'blue' ? 1 : -1;
    }

    canAct() {
      return !['punch', 'dodge', 'knockedDown', 'rising'].includes(this.state) && this.stun <= 0 && !this.ko;
    }

    isPunchActive() {
      if (this.state !== 'punch' || !this.punch) return false;
      const p = PUNCHES[this.punch];
      return this.stateTime >= p.wind && this.stateTime <= p.wind + p.active;
    }

    startPunch(type, game) {
      const punch = PUNCHES[type];
      if (!punch || !this.canAct()) return false;
      if (punch.requiresPower && this.power < 100) {
        if (this.isPlayer) game.setMessage('Power meter is not full yet.', 0.8);
        return false;
      }
      if (this.stamina < punch.cost) {
        if (this.isPlayer) game.setMessage('Too tired. Back up and recover stamina.', 0.8);
        return false;
      }
      this.state = 'punch';
      this.stateTime = 0;
      this.punch = type;
      this.hasHit = false;
      this.blocking = false;
      this.stamina = clamp(this.stamina - punch.cost, 0, 100);
      if (punch.requiresPower) this.power = 0;
      game.audio.punch(punch.sound);
      return true;
    }

    startDodge() {
      if (!this.canAct() || this.stamina < 11) return false;
      this.state = 'dodge';
      this.stateTime = 0;
      this.dodgeTimer = 0.28;
      this.blocking = false;
      this.stamina = clamp(this.stamina - 11, 0, 100);
      this.vx -= this.facing * 210;
      return true;
    }

    knockDown(by, game) {
      if (this.state === 'knockedDown' || this.ko) return;
      this.health = 0;
      this.state = 'knockedDown';
      this.stateTime = 0;
      this.punch = null;
      this.blocking = false;
      this.getupMeter = 0;
      this.knockdowns += 1;
      this.roundKnockdowns += 1;
      by.score += 80;
      by.roundScore += 80;
      this.lastHitBy = by;
      game.bigImpact(this.x, this.y - 120, this.corner === 'blue' ? '#3db8ff' : '#ff4e64');
      game.setMessage(`${this.name} is down!`, 1.2);
      game.audio.bell();
      game.shake = 20;
    }

    takeHit(attacker, punchType, game) {
      const punch = PUNCHES[punchType];
      const facingAttacker = Math.sign(attacker.x - this.x) === this.facing;
      const dodged = this.state === 'dodge' && this.dodgeTimer > 0.05;
      const guarded = this.blocking && facingAttacker && this.stamina > 4 && !dodged;

      if (dodged) {
        game.floatText(this.x, this.y - 160, 'MISS', '#aeb8d8');
        this.power = clamp(this.power + 6, 0, 100);
        return { landed: false, guarded: false, dodged: true, damage: 0 };
      }

      let damage = guarded ? punch.guardDamage : punch.damage;
      damage *= attacker.ai ? game.rules.aiPower : 1;
      damage *= attacker.stamina < 25 ? 0.72 : 1;
      damage *= this.stamina < 20 && !guarded ? 1.15 : 1;
      damage *= punchType === 'power' ? 1 + attacker.combo * 0.025 : 1;

      if (guarded) {
        this.stamina = clamp(this.stamina - punch.staminaDamage, 0, 100);
        attacker.score += Math.round(punch.score * 0.35);
        attacker.roundScore += Math.round(punch.score * 0.35);
        game.guardImpact(this.x + this.facing * 34, this.y + punch.y + 12);
        game.audio.hit(false);
      } else {
        this.health = clamp(this.health - damage, 0, 100);
        this.flash = 0.15;
        this.stun = Math.max(this.stun, punchType === 'jab' ? 0.08 : punchType === 'power' ? 0.34 : 0.18);
        this.vx += attacker.facing * (punchType === 'power' ? 250 : 125);
        attacker.score += punch.score;
        attacker.roundScore += punch.score;
        attacker.damageDoneRound += damage;
        attacker.cleanHitsRound += 1;
        attacker.combo += 1;
        attacker.comboTimer = 1.65;
        attacker.power = clamp(attacker.power + punch.powerGain + (punchType === 'power' ? 0 : 2), 0, 100);
        game.hitImpact(this.x - this.facing * 28, this.y + punch.y + 8, punchType, damage);
        game.audio.hit(punchType === 'hook' || punchType === 'uppercut' || punchType === 'power');
        game.shake = Math.max(game.shake, punchType === 'power' ? 18 : punchType === 'jab' ? 4 : 9);
      }

      if (this.health <= 0) {
        this.knockDown(attacker, game);
      }

      return { landed: true, guarded, dodged: false, damage };
    }

    update(dt, game, opponent, input) {
      this.breath += dt * (this.stamina < 30 ? 5 : 2.4);
      this.flash = Math.max(0, this.flash - dt);
      this.stun = Math.max(0, this.stun - dt);
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 0;
      this.facing = this.x < opponent.x ? 1 : -1;

      if (this.state === 'knockedDown') {
        this.updateKnockdown(dt, game);
        return;
      }

      if (this.state === 'rising') {
        this.stateTime += dt;
        if (this.stateTime > 0.9) this.state = 'idle';
        return;
      }

      if (this.state === 'punch') {
        this.stateTime += dt;
        const p = PUNCHES[this.punch];
        if (!this.hasHit && this.isPunchActive()) {
          if (game.checkPunchCollision(this, opponent, p)) {
            opponent.takeHit(this, this.punch, game);
            this.hasHit = true;
          } else if (this.stateTime > p.wind + p.active * 0.62) {
            this.hasHit = true;
          }
        }
        if (this.stateTime >= p.wind + p.active + p.recover) {
          this.state = 'idle';
          this.punch = null;
          this.hasHit = false;
        }
      } else if (this.state === 'dodge') {
        this.stateTime += dt;
        if (this.stateTime >= 0.34) this.state = 'idle';
      }

      if (this.stun <= 0 && game.phase === 'fighting') {
        if (this.isPlayer) this.handlePlayer(dt, input, game);
        else this.handleAI(dt, game, opponent);
      } else {
        this.blocking = false;
      }

      const regen = this.blocking ? 5 : this.state === 'idle' ? 18 : 8;
      this.stamina = clamp(this.stamina + regen * dt, 0, 100);
      if (this.blocking) this.stamina = clamp(this.stamina - 5.5 * dt, 0, 100);
      if (this.stamina <= 2) this.blocking = false;

      this.vx *= Math.pow(0.0008, dt);
      this.x += this.vx * dt;
      this.x = clamp(this.x, RING_LEFT + 50, RING_RIGHT - 50);
      this.stepPhase += Math.abs(this.vx) * dt * 0.035;
    }

    updateKnockdown(dt, game) {
      this.stateTime += dt;
      if (this.isPlayer) {
        if (game.input.tapped('Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyI')) this.getupMeter += 18 + Math.max(0, 4 - this.knockdowns) * 2;
        this.getupMeter += dt * 12;
      } else {
        this.getupMeter += dt * (38 + game.rules.getUp * 34 - this.knockdowns * 5);
      }
      const count = Math.floor(this.stateTime) + 1;
      if (count !== game.countNumber && count <= 10) {
        game.countNumber = count;
        game.setMessage(`Count ${count}! ${this.isPlayer ? 'Tap Space/J/K to get up.' : ''}`, 0.95);
        game.audio.tone(440 + count * 20, 0.06, 'square', 0.07);
      }
      if (this.getupMeter >= 100 && this.stateTime >= 2.2 && this.knockdowns < 3) {
        this.health = clamp(34 - this.knockdowns * 7, 16, 34);
        this.stamina = clamp(74 - this.knockdowns * 10, 35, 70);
        this.state = 'rising';
        this.stateTime = 0;
        this.getupMeter = 0;
        game.phase = 'fighting';
        game.countNumber = 0;
        game.setMessage(`${this.name} beats the count!`, 1.1);
      }
      if (this.stateTime >= 10 || this.knockdowns >= 3) {
        this.ko = true;
        game.endFight(this.lastHitBy, 'KO');
      }
    }

    handlePlayer(dt, input, game) {
      const left = input.pressed('KeyA', 'ArrowLeft');
      const right = input.pressed('KeyD', 'ArrowRight');
      const block = input.pressed('ShiftLeft', 'ShiftRight');
      const speed = this.stamina < 25 ? 165 : 225;

      if (this.canAct()) {
        if (left) this.vx -= speed * dt * 8;
        if (right) this.vx += speed * dt * 8;
        this.blocking = block && this.stamina > 5;

        if (input.tapped('KeyS', 'ArrowDown')) this.startDodge();
        else if (input.tapped('KeyF')) this.startPunch('power', game);
        else if (input.tapped('KeyI')) this.startPunch('uppercut', game);
        else if (input.tapped('KeyL')) this.startPunch('hook', game);
        else if (input.tapped('KeyK')) this.startPunch('cross', game);
        else if (input.tapped('KeyJ', 'Space')) this.startPunch('jab', game);
      }
    }

    handleAI(dt, game, opponent) {
      if (!this.ai) return;
      this.ai.timer -= dt;
      this.ai.reaction -= dt;
      const dist = Math.abs(opponent.x - this.x);
      const tooClose = dist < 110;
      const ideal = this.stamina > 35 ? 150 : 210;
      const pressure = game.rules.aiRate;
      const defense = game.rules.aiDefense;

      const opponentThreat = opponent.state === 'punch' && opponent.isPunchActive() && dist < 135;
      if (this.canAct()) {
        this.blocking = false;
        if (opponentThreat && Math.random() < defense * 0.075) {
          if (Math.random() < 0.42 && this.stamina > 18) this.startDodge();
          else this.blocking = true;
        }

        if (!this.blocking) {
          if (dist > ideal) this.vx += this.facing * 165 * dt * 8;
          if (tooClose && this.stamina < 28) this.vx -= this.facing * 145 * dt * 8;
          if (dist < 88 && this.stamina > 35) this.vx -= this.facing * 40 * dt * 8;
        }

        if (this.ai.timer <= 0) {
          this.ai.timer = rand(0.32, 0.82) / pressure;
          const canThrow = dist < 138 && this.stamina > 10 && !this.blocking;
          if (canThrow) {
            const tired = opponent.stamina < 25;
            const hurt = opponent.health < 35;
            let punch = 'jab';
            const roll = Math.random();
            if (this.power >= 100 && (hurt || roll > 0.82)) punch = 'power';
            else if (tired && roll > 0.45) punch = choice(['hook', 'uppercut', 'cross']);
            else if (roll > 0.72) punch = choice(['cross', 'hook']);
            else if (roll > 0.48) punch = 'cross';
            this.startPunch(punch, game);
          } else if (dist < 150 && Math.random() < 0.15 + defense * 0.1) {
            this.blocking = true;
            this.ai.timer = rand(0.18, 0.38);
          }
        }
      }
    }

    bodyParts() {
      const duck = this.state === 'dodge' ? 34 : 0;
      const down = this.state === 'knockedDown';
      const rising = this.state === 'rising';
      const bounce = Math.sin(this.breath) * 3;
      const baseY = this.y + bounce;
      const lean = this.state === 'punch' ? this.facing * 12 : this.blocking ? -this.facing * 4 : 0;
      const headX = this.x + lean;
      const headY = baseY - 176 + duck + (rising ? 38 : 0);
      return { duck, down, rising, bounce, baseY, lean, headX, headY };
    }

    draw(ctx, game) {
      const p = this.bodyParts();
      if (this.state === 'knockedDown') {
        this.drawKnockedDown(ctx);
        return;
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = this.ko ? 0.65 : 1;

      const bob = p.bounce;
      const duck = p.duck;
      const hitFlash = this.flash > 0;
      const glove = hitFlash ? '#ffffff' : this.glove;
      const skin = hitFlash ? '#fff0d0' : this.skin;

      ctx.save();
      ctx.scale(1, 0.24);
      const shadow = ctx.createRadialGradient(0, FLOOR_Y - this.y + 15, 10, 0, FLOOR_Y - this.y + 15, 96);
      shadow.addColorStop(0, 'rgba(0,0,0,0.42)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(0, FLOOR_Y - this.y + 15, 96, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const legSpread = 28 + Math.sin(this.stepPhase) * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#151827';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(-22, -72 + bob + duck * 0.25);
      ctx.lineTo(-legSpread, -22);
      ctx.lineTo(-52, 0);
      ctx.moveTo(22, -72 + bob + duck * 0.25);
      ctx.lineTo(legSpread, -22);
      ctx.lineTo(52, 0);
      ctx.stroke();

      ctx.strokeStyle = this.trim;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-52, 1);
      ctx.lineTo(-28, 1);
      ctx.moveTo(28, 1);
      ctx.lineTo(52, 1);
      ctx.stroke();

      ctx.fillStyle = this.color;
      roundRect(ctx, -46, -95 + bob + duck * 0.25, 92, 58, 14);
      ctx.fill();
      ctx.fillStyle = this.trim;
      ctx.fillRect(-5, -93 + bob + duck * 0.25, 10, 52);

      const torsoGrad = ctx.createLinearGradient(-50, -190 + bob, 48, -88 + bob);
      torsoGrad.addColorStop(0, this.color);
      torsoGrad.addColorStop(1, '#0f1324');
      ctx.fillStyle = torsoGrad;
      ctx.beginPath();
      ctx.moveTo(-52, -162 + bob + duck);
      ctx.quadraticCurveTo(0, -194 + bob + duck, 52, -162 + bob + duck);
      ctx.lineTo(42, -92 + bob + duck * 0.4);
      ctx.quadraticCurveTo(0, -74 + bob + duck * 0.35, -42, -92 + bob + duck * 0.4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = skin;
      roundRect(ctx, -15, -192 + bob + duck, 30, 28, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -218 + bob + duck, 33, 39, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#11101a';
      ctx.beginPath();
      ctx.ellipse(-4, -244 + bob + duck, 31, 14, -0.08, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#12131c';
      ctx.beginPath();
      ctx.arc(12, -220 + bob + duck, 3, 0, Math.PI * 2);
      ctx.arc(-10, -220 + bob + duck, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4b2a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -204 + bob + duck);
      ctx.quadraticCurveTo(0, -199 + bob + duck, 12, -204 + bob + duck);
      ctx.stroke();

      this.drawArms(ctx, bob, duck, glove, skin);

      if (this.blocking) {
        ctx.strokeStyle = this.corner === 'blue' ? 'rgba(61,184,255,0.42)' : 'rgba(255,78,100,0.42)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(30, -166 + bob + duck, 62, -1.1, 1.2);
        ctx.stroke();
      }

      if (this.power >= 100 && game.phase === 'fighting') {
        ctx.strokeStyle = 'rgba(255,200,87,0.5)';
        ctx.lineWidth = 3 + Math.sin(game.elapsed * 10) * 1.5;
        ctx.beginPath();
        ctx.ellipse(0, -130 + bob + duck * 0.2, 76, 132, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawArms(ctx, bob, duck, glove, skin) {
      let frontArm = { sx: 38, sy: -154, ex: 78, ey: -151, gx: 88, gy: -150 };
      let backArm = { sx: -34, sy: -154, ex: 32, ey: -166, gx: 46, gy: -168 };

      if (this.blocking) {
        frontArm = { sx: 34, sy: -158, ex: 30, ey: -196, gx: 26, gy: -214 };
        backArm = { sx: -32, sy: -156, ex: -8, ey: -190, gx: 4, gy: -210 };
      }

      if (this.state === 'dodge') {
        frontArm.ey += 20; frontArm.gy += 18;
        backArm.ey += 20; backArm.gy += 18;
      }

      if (this.state === 'punch' && this.punch) {
        const punch = PUNCHES[this.punch];
        const total = punch.wind + punch.active + punch.recover;
        const extend = this.stateTime < punch.wind
          ? easeIn(clamp(this.stateTime / punch.wind, 0, 1)) * 0.35
          : this.stateTime < punch.wind + punch.active
            ? 1
            : 1 - easeOut(clamp((this.stateTime - punch.wind - punch.active) / punch.recover, 0, 1));

        if (this.punch === 'jab') {
          frontArm = { sx: 36, sy: -154, ex: 78 + 78 * extend, ey: -154, gx: 95 + 112 * extend, gy: -154 };
        } else if (this.punch === 'cross') {
          backArm = { sx: -30, sy: -154, ex: 34 + 96 * extend, ey: -160, gx: 46 + 126 * extend, gy: -160 };
          frontArm = { sx: 34, sy: -150, ex: 52, ey: -174, gx: 62, gy: -184 };
        } else if (this.punch === 'hook') {
          frontArm = { sx: 36, sy: -154, ex: 78 + 45 * extend, ey: -128, gx: 72 + 112 * extend, gy: -120 };
        } else if (this.punch === 'uppercut') {
          frontArm = { sx: 32, sy: -150, ex: 54 + 52 * extend, ey: -112 - 20 * extend, gx: 62 + 64 * extend, gy: -92 - 74 * extend };
        } else if (this.punch === 'power') {
          backArm = { sx: -30, sy: -154, ex: 44 + 104 * extend, ey: -150 + Math.sin(extend * Math.PI) * 25, gx: 58 + 148 * extend, gy: -150 };
          frontArm = { sx: 34, sy: -152, ex: 50, ey: -184, gx: 64, gy: -190 };
        }
      }

      drawArm(ctx, backArm, bob, duck, skin, glove);
      drawArm(ctx, frontArm, bob, duck, skin, glove);
    }

    drawKnockedDown(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y - 10);
      ctx.scale(this.facing, 1);
      ctx.globalAlpha = 0.95;
      ctx.save();
      ctx.scale(1, 0.22);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.arc(0, 40, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.rotate(-0.08);
      ctx.fillStyle = this.color;
      roundRect(ctx, -72, -74, 142, 58, 18);
      ctx.fill();
      ctx.fillStyle = this.skin;
      ctx.beginPath();
      ctx.ellipse(88, -76, 36, 30, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.glove;
      ctx.beginPath();
      ctx.ellipse(-92, -42, 28, 24, 0, 0, Math.PI * 2);
      ctx.ellipse(28, -108, 28, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#151827';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-34, -20);
      ctx.lineTo(-86, 10);
      ctx.moveTo(18, -20);
      ctx.lineTo(84, -4);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Game {
    constructor() {
      this.input = new InputManager();
      this.audio = new AudioEngine();
      this.career = CareerStore.load();
      this.player = new Fighter({
        name: 'Quan', corner: 'blue', x: 360, facing: 1, isPlayer: true,
        color: '#1e64ff', trim: '#9be7ff', skin: '#b87850', glove: '#3db8ff'
      });
      this.enemy = new Fighter({
        name: 'Titan Vale', corner: 'red', x: 920, facing: -1, isPlayer: false,
        color: '#8e1b31', trim: '#ffc857', skin: '#c9946b', glove: '#ff4e64', ai: { timer: 0.8, reaction: 0 }
      });
      this.running = false;
      this.training = false;
      this.paused = false;
      this.phase = 'menu';
      this.round = 1;
      this.maxRounds = 3;
      this.roundDuration = 60;
      this.timeLeft = this.roundDuration;
      this.rules = DIFFICULTY.contender;
      this.difficultyKey = 'contender';
      this.elapsed = 0;
      this.last = performance.now();
      this.shake = 0;
      this.messageTimer = 0;
      this.particles = [];
      this.flashAlpha = 0;
      this.scoreHistory = [];
      this.countNumber = 0;
      this.roundBreakTimer = 0;
      this.crowdSeed = Array.from({ length: 120 }, (_, i) => ({
        x: (i % 30) * 45 + rand(-8, 8),
        y: Math.floor(i / 30) * 36 + rand(-6, 6),
        c: choice(['#27304f', '#383055', '#503044', '#263f4c', '#4f3f25'])
      }));
      this.bindUI();
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      requestAnimationFrame((t) => this.loop(t));
      this.updateUI();
      this.draw();
    }

    bindUI() {
      UI.startBtn.addEventListener('click', () => this.start(false));
      UI.trainingBtn.addEventListener('click', () => this.start(true));
      UI.pauseBtn.addEventListener('click', () => this.togglePause());
      UI.resumeBtn.addEventListener('click', () => this.togglePause(false));
      UI.restartBtn.addEventListener('click', () => this.start(this.training));
      UI.menuBtn.addEventListener('click', () => this.openMenu());
      UI.againBtn.addEventListener('click', () => this.start(this.training));
      UI.resultMenuBtn.addEventListener('click', () => this.openMenu());
      UI.resetCareerBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Reset your career save? This will erase wins, XP, money, and upgrades.');
        if (!confirmed) return;

        this.career = CareerStore.reset();
        this.updateCareerUI();
        this.setMessage('Career reset.', 1);
        });
      UI.soundToggle.addEventListener('click', () => this.audio.setEnabled(!this.audio.enabled));
      window.addEventListener('blur', () => {
        if (this.phase === 'fighting') this.togglePause(true);
      });
    }

    resizeCanvas() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    start(training = false) {
      this.audio.ensure();
      this.training = training;
      this.running = true;
      this.paused = false;
      this.phase = 'intro';
      this.round = 1;
      this.maxRounds = training ? 99 : Number(UI.roundsSelect.value);
      this.roundDuration = training ? 999 : Number(UI.timeSelect.value);
      this.timeLeft = this.roundDuration;
      this.difficultyKey = UI.difficultySelect.value;
      this.rules = DIFFICULTY[this.difficultyKey] || DIFFICULTY.contender;
      this.player.name = (UI.nameInput.value || 'Blue').trim().slice(0, 14) || 'Blue';
      if (!training) {
        this.career.fighterName = this.player.name;
        CareerStore.save(this.career);
        }
      this.enemy.name = training ? 'Spar Bot' : this.difficultyKey === 'champion' ? 'Dante Knox' : this.difficultyKey === 'rookie' ? 'Rico Blaze' : 'Titan Vale';
      this.scoreHistory = [];
      this.countNumber = 0;
      this.player.resetFight();
      this.enemy.resetFight();
      this.enemy.health = training ? 120 : 100;
      this.enemy.ai.timer = 1;
      this.particles = [];
      this.shake = 0;
      this.setMessage(training ? 'Training mode: practice combinations.' : 'Touch gloves. Fight!', 1.4);
      hide(UI.mainMenu);
      hide(UI.resultMenu);
      hide(UI.pauseMenu);
      this.audio.bell();
      window.setTimeout(() => {
        if (this.phase === 'intro') this.phase = 'fighting';
      }, 850);
      this.updateUI();
    }

    openMenu() {
      this.phase = 'menu';
      this.running = false;
      this.paused = false;
      show(UI.mainMenu);
      hide(UI.pauseMenu);
      hide(UI.resultMenu);
      this.setMessage('Press Start Fight', 1);
      this.updateUI();
    }

    togglePause(force) {
      if (!this.running || this.phase === 'menu' || this.phase === 'ended') return;
      this.paused = typeof force === 'boolean' ? force : !this.paused;
      if (this.paused) show(UI.pauseMenu);
      else hide(UI.pauseMenu);
    }

    loop(t) {
      const rawDt = Math.min(0.033, (t - this.last) / 1000 || 0);
      this.last = t;
      if (!this.paused) {
        this.update(rawDt);
        this.draw();
      }
      this.input.endFrame();
      requestAnimationFrame((nt) => this.loop(nt));
    }

    update(dt) {
      this.elapsed += dt;
      this.messageTimer = Math.max(0, this.messageTimer - dt);
      if (this.messageTimer <= 0 && this.phase === 'fighting') UI.messageLabel.textContent = '';
      this.shake = Math.max(0, this.shake - dt * 45);
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);

      for (const particle of this.particles) particle.update(dt);
      this.particles = this.particles.filter((p) => p.life > 0);

      if (this.input.tapped('KeyP', 'Escape') && this.running && this.phase !== 'ended') {
        this.togglePause();
      }

      if (!this.running) {
        this.updateUI();
        return;
      }

      if (this.phase === 'intro') {
        this.player.update(dt, this, this.enemy, this.input);
        this.enemy.update(dt, this, this.player, this.input);
        this.updateUI();
        return;
      }

      if (this.phase === 'roundBreak') {
        this.roundBreakTimer -= dt;
        if (this.roundBreakTimer <= 0) this.nextRound();
        this.updateUI();
        return;
      }

      if (this.phase !== 'fighting') {
        this.updateUI();
        return;
      }

      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.player.update(dt, this, this.enemy, this.input);
      this.enemy.update(dt, this, this.player, this.input);
      this.separateFighters();

      if (this.timeLeft <= 0 && !this.training) {
        this.finishRound();
      }

      this.updateUI();
    }

    separateFighters() {
      const dist = Math.abs(this.enemy.x - this.player.x);
      const minDist = 82;
      if (dist < minDist && this.player.state !== 'knockedDown' && this.enemy.state !== 'knockedDown') {
        const push = (minDist - dist) * 0.5;
        const dir = this.player.x < this.enemy.x ? -1 : 1;
        this.player.x += dir * push;
        this.enemy.x -= dir * push;
        this.player.x = clamp(this.player.x, RING_LEFT + 50, RING_RIGHT - 50);
        this.enemy.x = clamp(this.enemy.x, RING_LEFT + 50, RING_RIGHT - 50);
      }
    }

    checkPunchCollision(attacker, defender, punch) {
      if (defender.state === 'knockedDown' || defender.ko) return false;
      const ax = attacker.x + attacker.facing * (punch.range + punch.width * 0.4);
      const ay = attacker.y + punch.y + (attacker.state === 'dodge' ? 25 : 0);
      const attackBox = {
        x: ax - punch.width / 2,
        y: ay - punch.height / 2,
        w: punch.width,
        h: punch.height
      };
      const duck = defender.state === 'dodge' ? 34 : 0;
      const defendBox = {
        x: defender.x - 42,
        y: defender.y - 208 + duck,
        w: 84,
        h: 148
      };
      return rectsOverlap(attackBox, defendBox);
    }

    finishRound() {
      const result = this.scoreRound();
      this.scoreHistory.push(result);
      this.phase = 'roundBreak';
      this.roundBreakTimer = 3.2;
      this.audio.bell();
      this.setMessage(`Round ${this.round} over: ${result.player}-${result.enemy}`, 3);
      if (this.round >= this.maxRounds) {
        this.endFight(null, 'Decision');
      }
    }

    scoreRound() {
      const p = this.player.roundScore + this.player.cleanHitsRound * 3 + this.enemy.roundKnockdowns * 35;
      const e = this.enemy.roundScore + this.enemy.cleanHitsRound * 3 + this.player.roundKnockdowns * 35;
      let ps = 10;
      let es = 10;
      if (p > e + 12) es = 9;
      else if (e > p + 12) ps = 9;
      else if (p >= e) es = 9;
      else ps = 9;
      if (this.enemy.roundKnockdowns > 0) es = Math.max(7, es - this.enemy.roundKnockdowns);
      if (this.player.roundKnockdowns > 0) ps = Math.max(7, ps - this.player.roundKnockdowns);
      return {
        round: this.round,
        player: ps,
        enemy: es,
        playerWork: Math.round(p),
        enemyWork: Math.round(e),
        playerHits: this.player.cleanHitsRound,
        enemyHits: this.enemy.cleanHitsRound
      };
    }

    nextRound() {
      this.round += 1;
      this.timeLeft = this.roundDuration;
      this.player.resetRound();
      this.enemy.resetRound();
      this.enemy.health = this.training ? 120 : this.enemy.health;
      this.phase = 'intro';
      this.countNumber = 0;
      this.setMessage(`Round ${this.round}. Fight!`, 1.2);
      this.audio.bell();
      window.setTimeout(() => {
        if (this.phase === 'intro') this.phase = 'fighting';
      }, 800);
    }

    endFight(winner, method) {
      if (this.phase === 'ended') return;
      this.phase = 'ended';
      this.running = false;
      hide(UI.pauseMenu);

      if (!winner && method === 'Decision') {
        const totals = this.scoreHistory.reduce((acc, r) => {
          acc.player += r.player;
          acc.enemy += r.enemy;
          return acc;
        }, { player: 0, enemy: 0 });
        if (totals.player > totals.enemy) winner = this.player;
        else if (totals.enemy > totals.player) winner = this.enemy;
        else winner = null;
      }

      const playerWon = winner === this.player;
      const draw = !winner;
      const totalPlayer = this.scoreHistory.reduce((sum, r) => sum + r.player, 0);
      const totalEnemy = this.scoreHistory.reduce((sum, r) => sum + r.enemy, 0);
      let careerRewardText = '';

      if (!this.training) {
        const outcome = draw ? 'draw' : playerWon ? 'win' : 'loss';

        const rewards = window.MBC_DATA.calculateRewards({
            outcome,
            method,
            difficulty: this.difficultyKey,
            playerScore: this.player.score
        });

        this.career.fights += 1;

        if (outcome === 'win') this.career.wins += 1;
        if (outcome === 'loss') this.career.losses += 1;
        if (outcome === 'draw') this.career.draws += 1;
        if (outcome === 'win' && method === 'KO') this.career.kos += 1;

        this.career.cash += rewards.cash;
        CareerStore.addXP(this.career, rewards.xp);

        if (this.player.score > this.career.bestScore) {
            this.career.bestScore = Math.round(this.player.score);
        }

        if (this.career.level >= 5) this.career.title = 'Dangerous Contender';
        if (this.career.level >= 10) this.career.title = 'Title Challenger';
        if (this.career.level >= 15) this.career.title = 'World Champion';

        CareerStore.save(this.career);

        careerRewardText = ` Career rewards: +${rewards.xp} XP, +$${rewards.cash}.`;
        }
      const title = draw ? 'Majority Draw' : playerWon ? 'You Win!' : 'You Lose';
      const by = method === 'KO' ? 'by knockout' : `by decision ${totalPlayer}-${totalEnemy}`;

      UI.resultEyebrow.textContent = method === 'KO' ? 'Knockout Finish' : 'Judges Scorecards';
      UI.resultTitle.textContent = title;
      UI.resultCopy.textContent = draw
        ? `After ${this.scoreHistory.length} round(s), the judges could not separate the fighters.${careerRewardText}`
        : `${winner.name} wins ${by}. Final fight score: ${this.player.name} ${totalPlayer}, ${this.enemy.name} ${totalEnemy}.${careerRewardText}`;
      UI.scorecards.innerHTML = '';

      const rows = this.scoreHistory.length ? this.scoreHistory : [{ round: this.round, player: 0, enemy: 0, playerHits: this.player.cleanHitsRound, enemyHits: this.enemy.cleanHitsRound }];
      rows.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'scorecard';
        div.innerHTML = `<strong>Round ${r.round}</strong><span>${this.player.name}: ${r.player} · ${this.enemy.name}: ${r.enemy}</span><small>Clean hits ${r.playerHits}-${r.enemyHits}</small>`;
        UI.scorecards.appendChild(div);
      });

      const best = Number(localStorage.getItem('mbcBestScore') || 0);
      if (this.player.score > best) localStorage.setItem('mbcBestScore', String(Math.round(this.player.score)));

      this.audio.bell();
      show(UI.resultMenu);
      this.updateUI();
    }

    setMessage(text, seconds = 1) {
      UI.messageLabel.textContent = text;
      this.messageTimer = seconds;
    }

    floatText(x, y, text, color = '#ffffff') {
      const p = new Particle(x, y, rand(-20, 20), rand(-120, -80), 0.65, 22, text, 'text');
      p.draw = function drawTextParticle(ctx) {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.font = '1000 22px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeText(text, this.x, this.y);
        ctx.fillText(text, this.x, this.y);
        ctx.restore();
      };
      this.particles.push(p);
    }

    hitImpact(x, y, punchType, damage) {
      const heavy = punchType === 'hook' || punchType === 'uppercut' || punchType === 'power';
      const color = punchType === 'power' ? '#ffc857' : '#ffffff';
      for (let i = 0; i < (heavy ? 16 : 9); i++) {
        this.particles.push(new Particle(x, y, rand(-190, 190), rand(-260, 80), rand(0.18, 0.42), rand(2, heavy ? 6 : 4), color, Math.random() < 0.55 ? 'spark' : 'circle'));
      }
      for (let i = 0; i < 5; i++) {
        this.particles.push(new Particle(x, y + rand(-8, 14), rand(-90, 90), rand(-80, 60), rand(0.28, 0.6), rand(1.5, 3), 'rgba(255,78,100,0.85)'));
      }
      this.floatText(x, y - 28, Math.round(damage).toString(), heavy ? '#ffc857' : '#f5f7ff');
      this.flashAlpha = punchType === 'power' ? 0.22 : Math.max(this.flashAlpha, 0.08);
    }

    guardImpact(x, y) {
      for (let i = 0; i < 10; i++) {
        this.particles.push(new Particle(x, y, rand(-150, 150), rand(-170, 40), rand(0.16, 0.32), rand(2, 5), '#3db8ff', 'spark'));
      }
      this.floatText(x, y - 18, 'BLOCK', '#9be7ff');
      this.shake = Math.max(this.shake, 4);
    }

    bigImpact(x, y, color) {
      for (let i = 0; i < 42; i++) {
        this.particles.push(new Particle(x, y, rand(-340, 340), rand(-420, 100), rand(0.35, 0.9), rand(2, 7), i % 3 ? '#ffffff' : color, i % 2 ? 'spark' : 'circle'));
      }
      this.flashAlpha = 0.32;
    }

    updateCareerUI() {
    if (!this.career) return;

    const needed = window.MBC_DATA.xpToNextLevel(this.career.level);
    const progress = clamp((this.career.xp / needed) * 100, 0, 100);

    UI.careerTitle.textContent = this.career.title;
    UI.careerRecord.textContent = `${this.career.wins}-${this.career.losses}-${this.career.draws}`;
    UI.careerLevel.textContent = `Level ${this.career.level}`;
    UI.careerCash.textContent = `$${this.career.cash}`;
    UI.careerKos.textContent = `${this.career.kos} KOs`;
    UI.careerXpBar.style.width = `${progress}%`;
    UI.careerXpText.textContent = `${this.career.xp} / ${needed} XP`;
}

    updateUI() {
      const ph = clamp(this.player.health, 0, 100);
      const eh = clamp(this.enemy.health, 0, this.training ? 120 : 100);
      UI.playerName.textContent = this.player.name;
      UI.enemyName.textContent = this.enemy.name;
      UI.playerRecord.textContent = `Score ${Math.round(this.player.score)} · KD ${this.player.knockdowns}`;
      UI.enemyRecord.textContent = `${this.rules.label} AI · KD ${this.enemy.knockdowns}`;
      UI.playerHealthBar.style.width = `${ph}%`;
      UI.playerStaminaBar.style.width = `${clamp(this.player.stamina, 0, 100)}%`;
      UI.playerPowerBar.style.width = `${clamp(this.player.power, 0, 100)}%`;
      UI.enemyHealthBar.style.width = `${clamp((eh / (this.training ? 120 : 100)) * 100, 0, 100)}%`;
      UI.enemyStaminaBar.style.width = `${clamp(this.enemy.stamina, 0, 100)}%`;
      UI.enemyPowerBar.style.width = `${clamp(this.enemy.power, 0, 100)}%`;
      UI.roundLabel.textContent = this.training ? 'Training Mode' : `Round ${this.round} / ${this.maxRounds}`;
      UI.timerLabel.textContent = this.training ? '∞' : formatTime(this.timeLeft);
      UI.comboLabel.textContent = this.player.combo.toString();
      UI.comboText.textContent = this.player.power >= 100
        ? 'Power shot ready: press F.'
        : this.player.combo >= 3
          ? 'Combo flowing. Mix in hooks and uppercuts.'
          : 'Land clean punches to build power.';
    this.updateCareerUI();      
    }

    draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      const sx = this.shake > 0 ? rand(-this.shake, this.shake) : 0;
      const sy = this.shake > 0 ? rand(-this.shake * 0.5, this.shake * 0.5) : 0;
      ctx.translate(sx, sy);
      this.drawArena(ctx);
      this.drawRoundDecor(ctx);

      const fighters = [this.player, this.enemy].sort((a, b) => a.y - b.y || a.x - b.x);
      fighters.forEach((f) => f.draw(ctx, this));

      this.particles.forEach((p) => p.draw(ctx));
      this.drawForeground(ctx);
      if (this.phase === 'intro') this.drawCenterText(ctx, `ROUND ${this.round}`, 'FIGHT');
      if (this.phase === 'roundBreak') this.drawCenterText(ctx, 'ROUND OVER', `Next round in ${Math.ceil(this.roundBreakTimer)}`);
      if (this.player.state === 'knockedDown' || this.enemy.state === 'knockedDown') {
        const down = this.player.state === 'knockedDown' ? this.player : this.enemy;
        this.drawCount(ctx, down);
      }
      if (this.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    drawArena(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#090b17');
      sky.addColorStop(0.45, '#11152a');
      sky.addColorStop(1, '#060711');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      drawSpotlight(ctx, 205, -70, 430, 670, 'rgba(61,184,255,0.13)');
      drawSpotlight(ctx, 1080, -80, 500, 670, 'rgba(255,78,100,0.13)');
      drawSpotlight(ctx, 640, -100, 540, 700, 'rgba(255,200,87,0.11)');

      ctx.save();
      ctx.translate(0, 72);
      this.crowdSeed.forEach((person, i) => {
        const wave = Math.sin(this.elapsed * 2 + i) * 2;
        ctx.fillStyle = person.c;
        roundRect(ctx, person.x - 10, person.y + wave, 24, 28, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.arc(person.x + 2, person.y + 4 + wave, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, 410, 72, 460, 120, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,87,0.88)';
      ctx.font = '1000 36px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('MIDNIGHT BOXING', 640, 125);
      ctx.fillStyle = 'rgba(245,247,255,0.55)';
      ctx.font = '800 16px Inter, system-ui';
      ctx.fillText(`${this.player.name.toUpperCase()}  VS  ${this.enemy.name.toUpperCase()}`, 640, 154);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(150, 330);
      ctx.lineTo(1130, 330);
      ctx.lineTo(1238, 642);
      ctx.lineTo(42, 642);
      ctx.closePath();
      const mat = ctx.createLinearGradient(0, 330, 0, 650);
      mat.addColorStop(0, '#263455');
      mat.addColorStop(1, '#11182d');
      ctx.fillStyle = mat;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const y = lerp(340, 635, i / 17);
        ctx.beginPath();
        ctx.moveTo(90 + i * 2, y);
        ctx.lineTo(1190 - i * 2, y);
        ctx.stroke();
      }
      for (let i = 0; i < 16; i++) {
        const x = lerp(100, 1180, i / 15);
        ctx.beginPath();
        ctx.moveTo(x, 340);
        ctx.lineTo(lerp(42, 1238, i / 15), 642);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(640, 500, 94, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = '#ffc857';
      ctx.font = '1000 56px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('MBC', 640, 518);
      ctx.globalAlpha = 1;
      ctx.restore();

      this.drawRopes(ctx, false);
    }

    drawRopes(ctx, foreground) {
      const ropeYs = foreground ? [388, 446, 504] : [344, 384, 424];
      const alpha = foreground ? 0.88 : 0.5;
      ctx.save();
      ctx.lineCap = 'round';
      ropeYs.forEach((y, i) => {
        ctx.strokeStyle = i === 1 ? `rgba(245,247,255,${alpha})` : foreground ? `rgba(255,78,100,${alpha})` : `rgba(61,184,255,${alpha})`;
        ctx.lineWidth = foreground ? 8 : 6;
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.quadraticCurveTo(640, y - (foreground ? 18 : 8), 1180, y);
        ctx.stroke();
      });
      const posts = [110, 1170];
      posts.forEach((x, idx) => {
        ctx.fillStyle = idx === 0 ? '#1e64ff' : '#8e1b31';
        roundRect(ctx, x - 16, 316, 32, 238, 9);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
      ctx.restore();
    }

    drawForeground(ctx) {
      this.drawRopes(ctx, true);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 643, W, 77);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 9; i++) {
        roundRect(ctx, 70 + i * 145, 665 + Math.sin(this.elapsed * 1.2 + i) * 4, 82, 36, 15);
        ctx.fill();
      }
    }

    drawRoundDecor(ctx) {
      if (this.phase === 'fighting') {
        const danger = this.player.health < 25 ? (Math.sin(this.elapsed * 8) + 1) * 0.05 : 0;
        if (danger > 0) {
          ctx.fillStyle = `rgba(255,78,100,${danger})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    }

    drawCenterText(ctx, line1, line2) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffc857';
      ctx.font = '1000 72px Inter, system-ui';
      ctx.fillText(line1, W / 2, 250);
      ctx.fillStyle = '#f5f7ff';
      ctx.font = '900 24px Inter, system-ui';
      ctx.fillText(line2, W / 2, 292);
      ctx.restore();
    }

    drawCount(ctx, fighter) {
      const count = clamp(Math.floor(fighter.stateTime) + 1, 1, 10);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, W / 2 - 150, 210, 300, 130, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffc857';
      ctx.font = '1000 76px Inter, system-ui';
      ctx.fillText(count.toString(), W / 2, 286);
      ctx.fillStyle = '#f5f7ff';
      ctx.font = '800 18px Inter, system-ui';
      ctx.fillText(fighter.isPlayer ? 'Tap Space/J/K to rise' : `${fighter.name} trying to rise`, W / 2, 316);
      const pct = clamp(fighter.getupMeter / 100, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, W / 2 - 105, 328, 210, 12, 8);
      ctx.fill();
      ctx.fillStyle = fighter.corner === 'blue' ? '#3db8ff' : '#ff4e64';
      roundRect(ctx, W / 2 - 103, 330, 206 * pct, 8, 6);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawArm(ctx, arm, bob, duck, skin, glove) {
    ctx.strokeStyle = skin;
    ctx.lineWidth = 19;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(arm.sx, arm.sy + bob + duck);
    ctx.quadraticCurveTo(arm.ex, arm.ey + bob + duck, arm.gx, arm.gy + bob + duck);
    ctx.stroke();
    const grad = ctx.createRadialGradient(arm.gx - 7, arm.gy + bob + duck - 9, 3, arm.gx, arm.gy + bob + duck, 30);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, glove);
    grad.addColorStop(1, '#4b1020');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(arm.gx, arm.gy + bob + duck, 27, 24, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function easeIn(t) {
    return t * t;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawSpotlight(ctx, x, y, radius, length, color) {
    const grad = ctx.createRadialGradient(x, y, 20, x, y + length * 0.55, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.22, y);
    ctx.lineTo(x + radius * 0.65, y + length);
    ctx.lineTo(x - radius * 0.65, y + length);
    ctx.closePath();
    ctx.fill();
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function show(element) {
    element.classList.add('open');
  }

  function hide(element) {
    element.classList.remove('open');
  }

  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
})();