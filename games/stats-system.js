// Stats System - Handles all stats for all game modes
const DEFAULT_STATS = () => ({ gamesPlayed: 0, totalGuesses: 0, bestGuesses: null, averageGuesses: 0 });
let allStats = {
  normal: { 3: DEFAULT_STATS(), 4: DEFAULT_STATS(), 5: DEFAULT_STATS() },
  reverse: { 3: DEFAULT_STATS(), 4: DEFAULT_STATS(), 5: DEFAULT_STATS() }
};
// Hot/Cold stats are separate due to different tracking (wins)
let hotColdStats = { gamesPlayed: 0, totalGuesses: 0, bestGuesses: null, wins: 0, averageGuesses: 0 };
// Coin system
let playerCoins = 0;

function loadStats() {
  // Only load from localStorage if no user is signed in
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    const saved = localStorage.getItem('numberGuessingAllStats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          // Deep merge to preserve structure
          for (const mode of ['normal', 'reverse']) {
            for (const digits of [3, 4, 5]) {
              if (parsed[mode] && parsed[mode][digits]) {
                allStats[mode][digits] = Object.assign({}, allStats[mode][digits], parsed[mode][digits]);
              }
            }
          }
        }
      } catch {}
    }
    // Load hot/cold stats
    const savedHotCold = localStorage.getItem('hotColdStats');
    if (savedHotCold) {
      try {
        const parsed = JSON.parse(savedHotCold);
        if (typeof parsed === 'object' && parsed !== null) {
          hotColdStats = Object.assign(hotColdStats, parsed);
        }
      } catch {}
    }
    // Load coins
    const savedCoins = localStorage.getItem('numberGuessingCoins');
    if (savedCoins) {
      try {
        const coins = parseInt(savedCoins);
        if (!isNaN(coins)) {
          playerCoins = coins;
        }
      } catch {}
    }
  }
}

function resetStatsToDefaults() {
  console.log('Resetting stats to defaults');
  allStats = {
    normal: { 3: DEFAULT_STATS(), 4: DEFAULT_STATS(), 5: DEFAULT_STATS() },
    reverse: { 3: DEFAULT_STATS(), 4: DEFAULT_STATS(), 5: DEFAULT_STATS() }
  };
  hotColdStats = { gamesPlayed: 0, totalGuesses: 0, bestGuesses: null, wins: 0, averageGuesses: 0 };
  playerCoins = 0;
}

async function loadUserStats() {
  console.log('Loading user stats...');
  console.log('Auth system available:', !!window.authSystem);
  console.log('User signed in:', window.authSystem ? window.authSystem.isSignedIn() : false);
  
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    console.log('No user signed in, loading from localStorage');
    loadStats(); // Load from localStorage for guest users
    return;
  }

  try {
    const user = window.authSystem.getCurrentUser();
    console.log('Current user:', user ? user.email : 'none');
    if (!user) return;

    const db = window.FirebaseApp.db;
    console.log('Loading stats for user:', user.uid);
    
    const doc = await db.collection('users').doc(user.uid).get();
    
    if (doc.exists) {
      const userData = doc.data();
      console.log('User data found in Firebase:', userData);
      
      if (userData.stats) {
        // Load all stats
        if (userData.stats.allStats) {
          allStats = userData.stats.allStats;
          console.log('Loaded allStats:', allStats);
        }
        
        // Load hot/cold stats
        if (userData.stats.hotColdStats) {
          hotColdStats = userData.stats.hotColdStats;
          console.log('Loaded hotColdStats:', hotColdStats);
        }
        
        // Load coins
        if (userData.stats.coins !== undefined) {
          playerCoins = userData.stats.coins;
          console.log('Loaded coins:', playerCoins);
        }
      } else {
        console.log('No stats found in user data, using defaults');
        resetStatsToDefaults();
      }
    } else {
      console.log('No user document found, using defaults');
      resetStatsToDefaults();
    }
  } catch (error) {
    console.error('Load user stats error:', error);
    console.log('Using default stats due to error');
    resetStatsToDefaults();
  }
}

function saveStats() {
  // Save to Firebase if user is signed in, otherwise save to localStorage
  if (window.authSystem && window.authSystem.isSignedIn()) {
    saveUserStats();
  } else {
    localStorage.setItem('numberGuessingAllStats', JSON.stringify(allStats));
    localStorage.setItem('hotColdStats', JSON.stringify(hotColdStats));
    localStorage.setItem('numberGuessingCoins', playerCoins.toString());
  }
}

async function saveUserStats() {
  if (!window.authSystem || !window.authSystem.isSignedIn()) return;

  try {
    const user = window.authSystem.getCurrentUser();
    if (!user) return;

    const db = window.FirebaseApp.db;
    const userData = {
      stats: {
        allStats: allStats,
        hotColdStats: hotColdStats,
        coins: playerCoins
      },
      lastUpdated: new Date().toISOString()
    };

    await db.collection('users').doc(user.uid).set(userData, { merge: true });
    console.log('User stats saved to Firebase');
    
    // Also update leaderboard when stats are saved
    if (window.leaderboardSystem && window.authSystem.getUserProfile()) {
      await window.leaderboardSystem.updateUserScore(
        user.uid, 
        window.authSystem.getUserProfile().username, 
        playerCoins
      );
    }
  } catch (error) {
    console.error('Save user stats error:', error);
  }
}

function getStats(isReverse, digits) {
  return allStats[isReverse ? 'reverse' : 'normal'][digits];
}

function updateStats(isReverse, digits, guesses) {
  const stats = getStats(isReverse, digits);
  stats.gamesPlayed++;
  stats.totalGuesses += guesses;
  if (stats.bestGuesses === null || guesses < stats.bestGuesses) {
    stats.bestGuesses = guesses;
  }
  // Calculate average guesses
  stats.averageGuesses = Math.round((stats.totalGuesses / stats.gamesPlayed) * 10) / 10;
  saveStats();
}

function updateHotColdStats(guesses, isWin = false) {
  hotColdStats.gamesPlayed++;
  hotColdStats.totalGuesses += guesses;
  if (isWin) {
    hotColdStats.wins++;
  }
  if (hotColdStats.bestGuesses === null || guesses < hotColdStats.bestGuesses) {
    hotColdStats.bestGuesses = guesses;
  }
  // Calculate average guesses
  hotColdStats.averageGuesses = Math.round((hotColdStats.totalGuesses / hotColdStats.gamesPlayed) * 10) / 10;
  saveStats();
}

function calculateCoins(gameType, gameMode, guesses, isWin = false) {
  if (!isWin) return 0;
  
  let coinsEarned = 0;
  
  if (gameType === 'normal') {
    // Special rewards for quick wins
    if (gameMode === 3 && guesses <= 3) {
      coinsEarned = 20;
    } else if (gameMode === 4 && guesses <= 4) {
      coinsEarned = 15;
    } else if (gameMode === 5 && guesses <= 3) {
      coinsEarned = 30;
    } else {
      // Base reward: (10 - guesses) coins
      coinsEarned = Math.max(1, 10 - guesses);
    }
  } else if (gameType === 'hotcold') {
    if (guesses <= 4) {
      coinsEarned = 50;
    } else {
      coinsEarned = 5;
    }
  }
  // Reverse games get no coins
  
  // Apply coin multiplier if active
  if (window.ShopSystem && window.ShopSystem.getInventory().activeMultiplier > 0) {
    coinsEarned *= 2;
    // Decrease multiplier count
    const inventory = window.ShopSystem.getInventory();
    inventory.activeMultiplier--;
    window.ShopSystem.saveUserShopData();
  }
  
  return coinsEarned;
}

function addCoins(amount) {
  playerCoins += amount;
  saveStats();
  
  // Update leaderboard when coins are earned
  if (window.leaderboardSystem) {
    window.leaderboardSystem.refreshUserScore();
  }
  
  return playerCoins;
}

function getCoins() {
  return playerCoins;
}

function getAllStats() {
  return {
    allStats: allStats,
    hotColdStats: hotColdStats,
    coins: playerCoins
  };
}

// Load stats immediately on page load
loadStats();

// Export functions for use in other game files
window.StatsSystem = {
  getStats,
  updateStats,
  updateHotColdStats,
  saveStats,
  loadUserStats,
  resetStatsToDefaults,
  hotColdStats, // Export hotColdStats directly for its specific updates
  calculateCoins,
  addCoins,
  getCoins,
  getAllStats
}; 