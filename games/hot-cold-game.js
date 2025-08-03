// Hot/Cold Game (1-100 guessing)
let hotColdMode = false;
let hotColdSecret = 0;
let hotColdGuesses = 0;
let hotColdHistory = [];

function showHotColdGame() {
  hotColdMode = true;
  hotColdSecret = Math.floor(Math.random() * 100) + 1;
  hotColdGuesses = 0;
  hotColdHistory = [];
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  renderHotColdUI();
}

function renderHotColdUI(message = '') {
  let historyHTML = '';
  if (hotColdHistory.length > 0) {
    historyHTML = '<div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(30,30,30,0.95); border-radius: 28px; padding: 2rem 2.5rem; box-shadow: 0 2px 24px #000a; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; z-index: 10; max-width: 300px;"><b style="color:#fff;font-size:1.5rem; margin-bottom:1rem;">Guesses:</b>' +
      hotColdHistory.map(({guess, feedback}) =>
        `<div style='margin:0.5rem 0; color:#fff; font-size:1.3rem;'>${guess} - ${feedback}</div>`
      ).join('') + '</div>';
  }
  const remainingGuesses = 6 - hotColdGuesses;
  gameScreen.innerHTML = `
    <button id="lobbyBtn" class="top-left">Lobby</button>
    ${renderHotColdStatsBar()}
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
      <div style="font-size: 2.5rem; color: #fff; margin-bottom: 2rem;">Guess a number between 1-100</div>
      <div style="font-size: 1.8rem; color: #fff; margin-bottom: 2rem;">Guesses remaining: ${remainingGuesses}</div>
      <input id="hotColdInput" type="number" min="1" max="100" style="font-size:2.5rem; padding:0.5rem 1.5rem; text-align:center; width: 8rem; border-radius: 0.5rem; border: none; outline: none;" autocomplete="off" />
      <div id="hotColdError" style="color:#ff4136; margin-top:1rem; font-size:1.2rem;"></div>
      <button id="hotColdSubmit" style="font-size:1.5rem; margin-top:2rem; padding:0.7rem 2.5rem;">Guess</button>
      <div style="color:#fff;margin-top:1.5rem;font-size:1.3rem;">${message}</div>
    </div>
    ${historyHTML}
  `;
  
  // Set up event listeners
  document.getElementById('lobbyBtn').addEventListener('click', () => { 
    hotColdMode = false; 
    showLobbyScreen(); 
  });
  
  document.getElementById('hotColdSubmit').addEventListener('click', handleHotColdGuess);
  document.getElementById('hotColdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleHotColdGuess();
    }
  });
}

function handleHotColdGuess() {
  const input = document.getElementById('hotColdInput');
  const guess = Number(input.value);
  
  if (isNaN(guess) || guess < 1 || guess > 100) {
    document.getElementById('hotColdError').textContent = 'Please enter a number between 1-100.';
    return;
  }
  
  document.getElementById('hotColdError').textContent = '';
  hotColdGuesses++;
  let feedback = '';
  
  if (guess === hotColdSecret) {
    feedback = 'Correct!';
    
    // Play winning sound
    if (window.soundSystem) {
      window.soundSystem.playWinningSound();
    }
    
    const coinsEarned = window.StatsSystem.calculateCoins('hotcold', null, hotColdGuesses, true);
    window.StatsSystem.addCoins(coinsEarned);
    window.StatsSystem.updateHotColdStats(hotColdGuesses, true);
    window.AchievementsSystem.checkAchievements('hotcold', null, hotColdGuesses);
    hotColdHistory.push({guess, feedback: `Correct! +${coinsEarned} coins`});
    setTimeout(() => renderHotColdUI(`You won! +${coinsEarned} coins`), 500);
    return;
  } else if (hotColdGuesses >= 6) {
    feedback = 'Out of guesses!';
    
    // Play loss sound
    if (window.soundSystem) {
      window.soundSystem.playLossSound();
    }
    
    window.StatsSystem.updateHotColdStats(hotColdGuesses, false);
    hotColdHistory.push({guess, feedback});
    setTimeout(() => renderHotColdUI(`Game over! The number was ${hotColdSecret}.`), 500);
    return;
  } else {
    if (guess > hotColdSecret) {
      feedback = 'Lower!';
    } else {
      feedback = 'Higher!';
    }
    hotColdHistory.push({guess, feedback});
    input.value = '';
    renderHotColdUI();
  }
}

function renderHotColdStatsBar() {
  const stats = window.StatsSystem.hotColdStats;
  return `<div style="position: absolute; top: 20px; right: 20px; background: rgba(30,30,30,0.95); 
              border-radius: 15px; padding: 1.5rem 2rem; box-shadow: 0 2px 24px #000a; z-index: 10;">
    <div style="font-size: 1.8rem; color: #fff; margin-bottom: 1rem; font-weight: bold;">Hot/Cold Stats</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Games: ${stats.gamesPlayed}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Wins: ${stats.wins}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Total Guesses: ${stats.totalGuesses}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Best: ${stats.bestGuesses || 'N/A'}</div>
    <div style="color: #ccc;">Average: ${stats.averageGuesses || 'N/A'}</div>
  </div>`;
}

// Export functions for use in main game.js
window.HotColdGame = {
  showHotColdGame
}; 