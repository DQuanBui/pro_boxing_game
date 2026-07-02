(() => {
  'use strict';

  const storageKey = 'mbcCareerV2';

  const upgradeDefinitions = [
    {
      id: 'conditioning',
      label: 'Conditioning',
      stat: 'Stamina',
      description: 'Recover faster and throw more punches before getting tired.',
      max: 5,
      baseCost: 120,
      growth: 85
    },
    {
      id: 'hands',
      label: 'Heavy Hands',
      stat: 'Damage',
      description: 'Punches hit harder and build power a little faster.',
      max: 5,
      baseCost: 145,
      growth: 95
    },
    {
      id: 'chin',
      label: 'Iron Chin',
      stat: 'Health',
      description: 'Adds max health and makes blocking easier on stamina.',
      max: 5,
      baseCost: 130,
      growth: 90
    },
    {
      id: 'footwork',
      label: 'Footwork',
      stat: 'Speed',
      description: 'Move faster and dodge for longer with a lower stamina cost.',
      max: 5,
      baseCost: 115,
      growth: 80
    },
    {
      id: 'focus',
      label: 'Ring IQ',
      stat: 'Points',
      description: 'Start with power, score more points, and earn better rewards.',
      max: 5,
      baseCost: 150,
      growth: 105
    }
  ];

  const objectives = [
    {
      id: 'points_260',
      label: 'Score 260 points',
      metric: 'points',
      target: 260,
      reward: { xp: 45, cash: 70, points: 120 }
    },
    {
      id: 'clean_18',
      label: 'Land 18 clean hits',
      metric: 'cleanHits',
      target: 18,
      reward: { xp: 50, cash: 75, points: 130 }
    },
    {
      id: 'combo_5',
      label: 'Build a 5-hit combo',
      metric: 'maxCombo',
      target: 5,
      reward: { xp: 55, cash: 85, points: 150 }
    },
    {
      id: 'knockdown_1',
      label: 'Score a knockdown',
      metric: 'knockdowns',
      target: 1,
      reward: { xp: 60, cash: 90, points: 170 }
    },
    {
      id: 'power_2',
      label: 'Land 2 power shots',
      metric: 'powerShots',
      target: 2,
      reward: { xp: 60, cash: 95, points: 180 }
    },
    {
      id: 'defense_5',
      label: 'Make 5 defensive plays',
      metric: 'defensiveMoves',
      target: 5,
      reward: { xp: 45, cash: 70, points: 125 }
    }
  ];

  const achievements = [
    {
      id: 'first_win',
      label: 'First Win',
      description: 'Win a professional fight.',
      condition: { type: 'outcome', value: 'win' },
      reward: { xp: 90, cash: 120 }
    },
    {
      id: 'first_ko',
      label: 'KO Artist',
      description: 'Win by knockout.',
      condition: { type: 'method', value: 'KO' },
      reward: { xp: 100, cash: 150 }
    },
    {
      id: 'combo_master',
      label: 'Combo Master',
      description: 'Reach a 6-hit combo in one fight.',
      condition: { type: 'statAtLeast', stat: 'maxCombo', value: 6 },
      reward: { xp: 90, cash: 130 }
    },
    {
      id: 'sharpshooter',
      label: 'Sharpshooter',
      description: 'Land 30 clean hits in one fight.',
      condition: { type: 'statAtLeast', stat: 'cleanHits', value: 30 },
      reward: { xp: 110, cash: 160 }
    },
    {
      id: 'champion_slayer',
      label: 'Champion Slayer',
      description: 'Beat Champion difficulty.',
      condition: { type: 'difficultyWin', value: 'champion' },
      reward: { xp: 150, cash: 240 }
    },
    {
      id: 'veteran',
      label: 'Ten Fight Veteran',
      description: 'Complete 10 professional fights.',
      condition: { type: 'careerAtLeast', stat: 'fights', value: 10 },
      reward: { xp: 140, cash: 220 }
    }
  ];

  function createUpgradeMap() {
    return upgradeDefinitions.reduce((acc, upgrade) => {
      acc[upgrade.id] = 0;
      return acc;
    }, {});
  }

  function createDefaultCareer() {
    return {
      version: 2,
      fighterName: 'Quan',
      title: 'Rookie Prospect',
      level: 1,
      xp: 0,
      cash: 250,
      fights: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      kos: 0,
      bestScore: 0,
      totalPoints: 0,
      totalXp: 0,
      totalCash: 250,
      achievements: {},
      upgrades: createUpgradeMap()
    };
  }

  function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
  }

  function titleForLevel(level) {
    if (level >= 20) return 'Undisputed Champion';
    if (level >= 15) return 'World Champion';
    if (level >= 10) return 'Title Challenger';
    if (level >= 5) return 'Dangerous Contender';
    return 'Rookie Prospect';
  }

  function xpToNextLevel(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    return 100 + (safeLevel - 1) * 65 + Math.pow(safeLevel - 1, 2) * 18;
  }

  function normalizeCareer(saved) {
    const fallback = createDefaultCareer();
    const career = {
      ...fallback,
      ...(saved || {}),
      achievements: {
        ...fallback.achievements,
        ...((saved && saved.achievements) || {})
      },
      upgrades: {
        ...fallback.upgrades,
        ...((saved && saved.upgrades) || {})
      }
    };

    career.level = Math.max(1, asNumber(career.level, 1));
    career.xp = asNumber(career.xp);
    career.cash = asNumber(career.cash);
    career.fights = asNumber(career.fights);
    career.wins = asNumber(career.wins);
    career.losses = asNumber(career.losses);
    career.draws = asNumber(career.draws);
    career.kos = asNumber(career.kos);
    career.bestScore = asNumber(career.bestScore);
    career.totalPoints = asNumber(career.totalPoints);
    career.totalXp = asNumber(career.totalXp);
    career.totalCash = asNumber(career.totalCash);
    career.fighterName = String(career.fighterName || fallback.fighterName).slice(0, 14);

    upgradeDefinitions.forEach((upgrade) => {
      career.upgrades[upgrade.id] = Math.min(upgrade.max, asNumber(career.upgrades[upgrade.id]));
    });

    career.title = titleForLevel(career.level);
    career.version = 2;
    return career;
  }

  function getUpgradeDefinition(id) {
    return upgradeDefinitions.find((upgrade) => upgrade.id === id);
  }

  function getUpgradeCost(id, currentLevel = 0) {
    const upgrade = getUpgradeDefinition(id);
    if (!upgrade || currentLevel >= upgrade.max) return null;
    return upgrade.baseCost + currentLevel * upgrade.growth + currentLevel * currentLevel * 25;
  }

  function readMetric(stats, metric) {
    if (metric === 'defensiveMoves') return (stats.blocks || 0) + (stats.dodges || 0);
    return stats[metric] || 0;
  }

  function pickObjective(career) {
    const index = Math.max(0, asNumber(career && career.fights)) % objectives.length;
    return objectives[index];
  }

  function calculateRewards({ outcome, method, difficulty, playerScore }) {
    const outcomeRewards = {
      win: { xp: 90, cash: 130 },
      draw: { xp: 60, cash: 80 },
      loss: { xp: 35, cash: 45 }
    };
    const difficultyMultiplier = {
      rookie: 0.9,
      contender: 1,
      champion: 1.35
    }[difficulty] || 1;
    const base = outcomeRewards[outcome] || outcomeRewards.loss;
    const score = Math.max(0, Number(playerScore) || 0);
    const scoreXp = Math.min(85, Math.floor(score / 25) * 5);
    const scoreCash = Math.min(120, Math.floor(score / 20) * 6);
    const methodBonus = method === 'KO' ? { xp: 45, cash: 75 } : { xp: 0, cash: 0 };

    return {
      xp: Math.round((base.xp + scoreXp + methodBonus.xp) * difficultyMultiplier),
      cash: Math.round((base.cash + scoreCash + methodBonus.cash) * difficultyMultiplier)
    };
  }

  window.MBC_DATA = {
    storageKey,
    upgradeDefinitions,
    objectives,
    achievements,
    createDefaultCareer,
    normalizeCareer,
    titleForLevel,
    xpToNextLevel,
    getUpgradeCost,
    pickObjective,
    readMetric,
    calculateRewards
  };
})();
