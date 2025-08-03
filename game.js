// Main Game Controller - Coordinates between different game modules
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');

function showLobbyScreen() {
  gameScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  document.removeEventListener('keydown', NormalGame.handleNormalGameKeydown);
  updateAchievementsButton();
  updateCoinDisplay();
}

function updateAchievementsButton() {
  const achievementsBtn = document.getElementById('achievementsBtn');
  if (achievementsBtn) {
    achievementsBtn.innerHTML = `🏆 Achievements (${window.AchievementsSystem ? window.AchievementsSystem.getProgress() : '0/0'})`;
  }
}

function updateCoinDisplay() {
  const coinDisplay = document.getElementById('coinDisplay');
  if (coinDisplay && window.StatsSystem) {
    const coins = window.StatsSystem.getCoins();
    coinDisplay.innerHTML = `�� ${coins}`;
  }
}

function refreshGameUI() {
  // Refresh achievements button
  updateAchievementsButton();
  // Refresh coin display
  updateCoinDisplay();
  // Setup shop button (in case it wasn't set up initially)
  setupShopButton();
  // If we're in a game, refresh the stats bar
  if (!gameScreen.classList.contains('hidden')) {
    // This will refresh the stats bar in the current game
    console.log('Game UI refreshed');
  }
}

// Lobby button event listeners
document.getElementById('newGame3Btn').addEventListener('click', () => {
  NormalGame.showGameScreen(3);
  document.addEventListener('keydown', NormalGame.handleNormalGameKeydown);
});

document.getElementById('newGameBtn').addEventListener('click', () => {
  NormalGame.showGameScreen(4);
  document.addEventListener('keydown', NormalGame.handleNormalGameKeydown);
});

document.getElementById('newGame5Btn').addEventListener('click', () => {
  NormalGame.showGameScreen(5);
  document.addEventListener('keydown', NormalGame.handleNormalGameKeydown);
});

document.getElementById('reverseGuessBtn').addEventListener('click', () => {
  ReverseGame.showReverseGuessingPrompt();
});

document.getElementById('hotColdBtn').addEventListener('click', () => {
  HotColdGame.showHotColdGame();
});

document.getElementById('multiplayerBtn').addEventListener('click', () => {
  console.log('Multiplayer button clicked');
  console.log('window.simpleMultiplayerSystem:', window.simpleMultiplayerSystem);
  if (window.simpleMultiplayerSystem) {
    console.log('Calling showMultiplayerMenu...');
    window.simpleMultiplayerSystem.showMultiplayerMenu();
  } else {
    console.error('Simple multiplayer system not available');
    alert('Multiplayer system is not loaded yet. Please wait a moment and try again.');
  }
});

document.getElementById('achievementsBtn').addEventListener('click', () => {
  AchievementsSystem.showAchievementsPanel();
});

// Set up shop button event listener with retry mechanism
function setupShopButton() {
  const shopBtn = document.getElementById('shopBtn');
  if (shopBtn && window.ShopSystem) {
    shopBtn.addEventListener('click', () => {
      if (window.ShopSystem) {
        window.ShopSystem.showShop();
      }
    });
  } else if (shopBtn && !window.ShopSystem) {
    // Retry after a short delay if shop system isn't loaded yet
    setTimeout(setupShopButton, 100);
  }
}

setupShopButton();

document.getElementById('leaderboardBtn').addEventListener('click', () => {
  if (window.leaderboardSystem) {
    window.leaderboardSystem.showLeaderboard();
  }
});

document.getElementById('soundToggleBtn').addEventListener('click', () => {
  if (window.soundSystem) {
    const isMuted = window.soundSystem.toggleMute();
    const soundBtn = document.getElementById('soundToggleBtn');
    soundBtn.innerHTML = isMuted ? '🔇 Sound' : '🔊 Sound';
    soundBtn.style.background = isMuted ? '#666' : '#333';
  }
});

document.getElementById('lobbyBtn').addEventListener('click', showLobbyScreen);

// Check for game URL parameter on page load
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game');
  
  if (gameId && window.multiplayerSystem) {
    // Clear the URL parameter
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Join the game
    window.multiplayerSystem.joinGame(gameId);
  }
});

// Initialize achievements button
updateAchievementsButton();
updateCoinDisplay();

// Export refreshGameUI for use in auth system
window.refreshGameUI = refreshGameUI; 