// Achievements System
const ACHIEVEMENTS = {
  firstWin: { name: "First Victory", description: "Win your first game", icon: "🏆", progress: () => ({ current: totalGamesPlayed > 0 ? 1 : 0, max: 1 }) },
  streak3: { name: "Hot Streak", description: "Win 3 games in a row", icon: "🔥", progress: () => ({ current: Math.min(currentStreak, 3), max: 3 }) },
  streak5: { name: "On Fire!", description: "Win 5 games in a row", icon: "🔥🔥", progress: () => ({ current: Math.min(currentStreak, 5), max: 5 }) },
  streak10: { name: "Unstoppable", description: "Win 10 games in a row", icon: "🔥🔥🔥", progress: () => ({ current: Math.min(currentStreak, 10), max: 10 }) },
  master3: { name: "3-Digit Master", description: "Win 10 games with 3 digits", icon: "🎯", progress: () => ({ current: gameWins.normal[3], max: 10 }) },
  master4: { name: "4-Digit Master", description: "Win 10 games with 4 digits", icon: "🎯🎯", progress: () => ({ current: gameWins.normal[4], max: 10 }) },
  master5: { name: "5-Digit Master", description: "Win 10 games with 5 digits", icon: "🎯🎯🎯", progress: () => ({ current: gameWins.normal[5], max: 10 }) },
  speedster: { name: "Speedster", description: "Win in 3 guesses or less", icon: "⚡", progress: () => ({ current: 0, max: 1 }) }, // Special case - no progress tracking
  reverseMaster: { name: "Reverse Master", description: "Win 5 reverse guessing games", icon: "🔄", progress: () => ({ current: Object.values(gameWins.reverse).reduce((a, b) => a + b, 0), max: 5 }) },
  hotColdMaster: { name: "Hot/Cold Master", description: "Win 5 hot/cold games", icon: "🌡️", progress: () => ({ current: gameWins.hotcold, max: 5 }) },
  persistent: { name: "Persistent", description: "Play 50 total games", icon: "💪", progress: () => ({ current: totalGamesPlayed, max: 50 }) },
  perfect: { name: "Perfect Guess", description: "Win in 1 guess", icon: "⭐", progress: () => ({ current: 0, max: 1 }) } // Special case - no progress tracking
};

let unlockedAchievements = new Set();
let newlyUnlockedAchievements = new Set(); // Track newly unlocked achievements
let currentStreak = 0;
let totalGamesPlayed = 0;
let gameWins = { normal: { 3: 0, 4: 0, 5: 0 }, reverse: { 3: 0, 4: 0, 5: 0 }, hotcold: 0 };

function loadAchievements() {
  // Only load from localStorage if no user is signed in
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    const saved = localStorage.getItem('numberGuessingAchievements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.unlocked) {
          unlockedAchievements = new Set(parsed.unlocked);
        }
        if (parsed.newlyUnlocked) {
          newlyUnlockedAchievements = new Set(parsed.newlyUnlocked);
        }
        if (parsed.streak !== undefined) currentStreak = parsed.streak;
        if (parsed.totalGames !== undefined) totalGamesPlayed = parsed.totalGames;
        if (parsed.gameWins) gameWins = parsed.gameWins;
      } catch (e) {
        console.error('Error loading achievements:', e);
      }
    }
  }
  // For signed-in users, achievements will be loaded by loadUserAchievements()
}

async function loadUserAchievements() {
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    console.log('No user signed in, loading from localStorage');
    loadAchievements(); // Load from localStorage for guest users
    return;
  }

  try {
    const user = window.authSystem.getCurrentUser();
    console.log('Loading achievements for user:', user.email);
    if (!user) return;

    const db = window.FirebaseApp.db;
    const doc = await db.collection('users').doc(user.uid).get();

    if (doc.exists) {
      const userData = doc.data();
      console.log('User data found in Firebase:', userData);

      if (userData.achievements) {
        // Load achievements data
        if (userData.achievements.unlocked) {
          unlockedAchievements = new Set(userData.achievements.unlocked);
          console.log('Loaded unlocked achievements:', unlockedAchievements);
        }
        if (userData.achievements.newlyUnlocked) {
          newlyUnlockedAchievements = new Set(userData.achievements.newlyUnlocked);
          console.log('Loaded newly unlocked achievements:', newlyUnlockedAchievements);
        }
        if (userData.achievements.streak !== undefined) {
          currentStreak = userData.achievements.streak;
          console.log('Loaded streak:', currentStreak);
        }
        if (userData.achievements.totalGames !== undefined) {
          totalGamesPlayed = userData.achievements.totalGames;
          console.log('Loaded total games:', totalGamesPlayed);
        }
        if (userData.achievements.gameWins) {
          gameWins = userData.achievements.gameWins;
          console.log('Loaded game wins:', gameWins);
        }
      } else {
        console.log('No achievements found in user data, using defaults');
        resetAchievementsToDefaults();
      }
    } else {
      console.log('No user document found, using defaults');
      resetAchievementsToDefaults();
    }
  } catch (error) {
    console.error('Load user achievements error:', error);
    console.log('Using default achievements due to error');
    resetAchievementsToDefaults();
  }
}

function saveAchievements() {
  // Save to Firebase if user is signed in, otherwise save to localStorage
  if (window.authSystem && window.authSystem.isSignedIn()) {
    saveUserAchievements();
  } else {
    localStorage.setItem('numberGuessingAchievements', JSON.stringify({
      unlocked: Array.from(unlockedAchievements),
      newlyUnlocked: Array.from(newlyUnlockedAchievements),
      streak: currentStreak,
      totalGames: totalGamesPlayed,
      gameWins: gameWins
    }));
  }
}

async function saveUserAchievements() {
  if (!window.authSystem || !window.authSystem.isSignedIn()) return;

  try {
    const user = window.authSystem.getCurrentUser();
    if (!user) return;

    const db = window.FirebaseApp.db;
    const achievementsData = {
      unlocked: Array.from(unlockedAchievements),
      newlyUnlocked: Array.from(newlyUnlockedAchievements),
      streak: currentStreak,
      totalGames: totalGamesPlayed,
      gameWins: gameWins,
      lastUpdated: new Date().toISOString()
    };

    await db.collection('users').doc(user.uid).update({
      achievements: achievementsData
    });
    console.log('User achievements saved to Firebase');
  } catch (error) {
    console.error('Save user achievements error:', error);
  }
}

function resetAchievementsToDefaults() {
  console.log('Resetting achievements to defaults');
  unlockedAchievements = new Set();
  newlyUnlockedAchievements = new Set();
  currentStreak = 0;
  totalGamesPlayed = 0;
  gameWins = { normal: { 3: 0, 4: 0, 5: 0 }, reverse: { 3: 0, 4: 0, 5: 0 }, hotcold: 0 };
}

function unlockAchievement(achievementId) {
  if (!unlockedAchievements.has(achievementId)) {
    unlockedAchievements.add(achievementId);
    newlyUnlockedAchievements.add(achievementId); // Mark as newly unlocked
    saveAchievements();
    
    // Clear the "newly unlocked" status after 10 seconds
    setTimeout(() => {
      newlyUnlockedAchievements.delete(achievementId);
    }, 10000);
    
    showAchievementPopup(ACHIEVEMENTS[achievementId]);
    return true;
  }
  return false;
}

function showAchievementPopup(achievement) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 1000; font-size: 1.2rem; max-width: 300px; animation: slideIn 0.5s ease-out;
  `;
  popup.innerHTML = `
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${achievement.icon}</div>
    <div style="font-weight: bold; margin-bottom: 0.3rem;">${achievement.name}</div>
    <div style="font-size: 0.9rem; opacity: 0.9;">${achievement.description}</div>
  `;
  document.body.appendChild(popup);
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    popup.style.animation = 'slideOut 0.5s ease-in';
    style.textContent += `
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    setTimeout(() => {
      document.body.removeChild(popup);
      document.head.removeChild(style);
    }, 500);
  }, 3000);
}

function checkAchievements(gameType, gameMode, guesses, timeTaken = null) {
  const newAchievements = [];
  
  // First win achievement
  if (unlockAchievement('firstWin')) {
    newAchievements.push('firstWin');
  }
  
  // Perfect score (minimum guesses)
  const minGuesses = gameType === 'hotcold' ? 1 : gameMode;
  if (guesses === minGuesses && unlockAchievement('perfect')) {
    newAchievements.push('perfect');
  }
  
  // Lucky guess
  if (guesses === 1 && unlockAchievement('perfect')) { // Changed to 'perfect' as LUCKY_GUESS is removed
    newAchievements.push('perfect');
  }
  
  // Quick thinker
  if (guesses <= 2 && unlockAchievement('speedster')) { // Changed to 'speedster' as QUICK_THINKER is removed
    newAchievements.push('speedster');
  }
  
  // Speed demon
  if (timeTaken && timeTaken < 30 && unlockAchievement('speedster')) { // Changed to 'speedster' as SPEED_DEMON is removed
    newAchievements.push('speedster');
  }
  
  // Update streak
  currentStreak++;
  if (currentStreak >= 3 && unlockAchievement('streak3')) {
    newAchievements.push('streak3');
  }
  if (currentStreak >= 5 && unlockAchievement('streak5')) {
    newAchievements.push('streak5');
  }
  if (currentStreak >= 10 && unlockAchievement('streak10')) {
    newAchievements.push('streak10');
  }
  
  // Update game wins
  if (gameType === 'normal') {
    gameWins.normal[gameMode]++;
    if (gameWins.normal[gameMode] >= 10) {
      if (gameMode === 3 && unlockAchievement('master3')) {
        newAchievements.push('master3');
      }
      if (gameMode === 4 && unlockAchievement('master4')) {
        newAchievements.push('master4');
      }
      if (gameMode === 5 && unlockAchievement('master5')) {
        newAchievements.push('master5');
      }
    }
  } else if (gameType === 'reverse') {
    gameWins.reverse[gameMode]++;
    const totalReverseWins = Object.values(gameWins.reverse).reduce((a, b) => a + b, 0);
    if (totalReverseWins >= 5 && unlockAchievement('reverseMaster')) {
      newAchievements.push('reverseMaster');
    }
  } else if (gameType === 'hotcold') {
    gameWins.hotcold++;
    if (gameWins.hotcold >= 5 && unlockAchievement('hotColdMaster')) {
      newAchievements.push('hotColdMaster');
    }
  }
  
  // Persistent player
  totalGamesPlayed++;
  if (totalGamesPlayed >= 50 && unlockAchievement('persistent')) {
    newAchievements.push('persistent');
  }
  if (totalGamesPlayed >= 100 && unlockAchievement('persistent')) { // Changed to 'persistent' as DEDICATED is removed
    newAchievements.push('persistent');
  }
  
  saveAchievements();
  return newAchievements;
}

function resetStreak() {
  currentStreak = 0;
  saveAchievements();
}

function renderAchievementsButton() {
  return `
    <button id="achievementsBtn" style="position: absolute; top: 24px; left: 24px; font-size: 1.5rem; padding: 0.5rem 1rem; background: #333; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
      🏆 Achievements (${unlockedAchievements.size}/${Object.keys(ACHIEVEMENTS).length})
    </button>
  `;
}

function showAchievementsPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.9); z-index: 1000; display: flex; 
    justify-content: center; align-items: center; overflow-y: auto;
  `;
  
  let achievementsHTML = `
    <div style="background: #1a1a1a; border-radius: 20px; padding: 3rem; 
                max-width: 800px; max-height: 80vh; overflow-y: auto; 
                box-shadow: 0 0 50px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2 style="color: #fff; margin: 0; font-size: 2.5rem;">🏆 Achievements</h2>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                style="background: #ff4136; color: white; border: none; padding: 0.5rem 1rem; 
                       border-radius: 5px; cursor: pointer; font-size: 1.2rem;">✕</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
  `;
  
  Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
    const isUnlocked = unlockedAchievements.has(id);
    const isNewlyUnlocked = newlyUnlockedAchievements.has(id);
    const backgroundColor = isUnlocked ? '#2d5a2d' : '#333';
    const opacity = isUnlocked ? '1' : '0.6';
    const borderColor = isNewlyUnlocked ? '#4CAF50' : 'transparent';
    const borderWidth = isNewlyUnlocked ? '3px' : '1px';
    
    // Get progress for this achievement
    const progress = achievement.progress();
    const progressPercent = Math.min((progress.current / progress.max) * 100, 100);
    const showProgress = progress.max > 1; // Only show progress for achievements that have a max > 1

    achievementsHTML += `
      <div style="margin: 1rem 0; padding: 1rem; border-radius: 8px; background: ${backgroundColor}; 
                  opacity: ${opacity}; border: ${borderWidth} solid ${borderColor};">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${achievement.icon}</div>
        <div style="font-weight: bold; margin-bottom: 0.3rem; color: #fff;">${achievement.name}</div>
        <div style="font-size: 0.9rem; opacity: 0.8; color: #ccc; margin-bottom: 0.5rem;">${achievement.description}</div>
        
        ${showProgress ? `
          <div style="margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span style="color: #ccc; font-size: 0.8rem;">Progress</span>
              <span style="color: #ccc; font-size: 0.8rem;">${progress.current}/${progress.max}</span>
            </div>
            <div style="background: #444; border-radius: 10px; height: 8px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #4CAF50, #45a049); 
                          height: 100%; width: ${progressPercent}%; transition: width 0.3s ease;"></div>
            </div>
          </div>
        ` : ''}
        
        ${isUnlocked ? '<div style="color: #4CAF50; font-size: 0.8rem; margin-top: 0.5rem;">✓ Unlocked</div>' : ''}
        ${isNewlyUnlocked ? '<div style="color: #4CAF50; font-size: 0.8rem; margin-top: 0.5rem; font-weight: bold;">🆕 New!</div>' : ''}
      </div>
    `;
  });
  
  achievementsHTML += `
      </div>
    </div>
  `;
  
  panel.innerHTML = achievementsHTML;
  document.body.appendChild(panel);
}

// Load achievements on startup
loadAchievements();

// Export functions for use in other game files
window.AchievementsSystem = {
  checkAchievements,
  resetStreak,
  renderAchievementsButton,
  showAchievementsPanel,
  getProgress: () => `${unlockedAchievements.size}/${Object.keys(ACHIEVEMENTS).length}`,
  getUnlockedAchievements: () => Array.from(unlockedAchievements), // Export for saving
  loadUserAchievements,
  resetAchievementsToDefaults
}; 