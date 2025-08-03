// Normal Number Guessing Games (3, 4, 5 digit)
let mode = 4; // Default mode
let secretNumber = '';
let guessInput = '';
let correctDigits = [null, null, null, null, null]; // Max 5 digits
let guessHistory = [];
let currentGuesses = 0;
let numberKnowledge = Array(10).fill(null);
let feedbackDiv; // Reference to the feedback div in the UI
let gameTimer = null;
let timeRemaining = 0;
let gameStartTime = 0;

function generateSecretNumber() {
  let num = '';
  for (let i = 0; i < mode; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

function getTimeLimit() {
  switch (mode) {
    case 3: return 20;
    case 4: return 30;
    case 5: return 40;
    default: return 30;
  }
}

function startTimer() {
  // Stop any existing timer first
  stopTimer();
  
  timeRemaining = getTimeLimit();
  gameStartTime = Date.now();
  
  function updateTimer() {
    if (timeRemaining <= 0) {
      // Time's up!
      stopTimer();
      
      // Play loss sound
      if (window.soundSystem) {
        window.soundSystem.playLossSound();
      }
      
      feedbackDiv.textContent = `Time's up! The number was ${secretNumber}`;
      window.StatsSystem.updateStats(false, mode, currentGuesses);
      setTimeout(() => {
        generateSecretNumber();
        resetGameState();
        renderGameUI();
        startTimer(); // Start new timer for next game
      }, 2000);
      return;
    }
    
    timeRemaining--;
    updateTimerDisplay();
  }
  
  gameTimer = setInterval(updateTimer, 1000);
  updateTimerDisplay();
}

function stopTimer() {
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

function updateTimerDisplay() {
  const timerElement = document.getElementById('gameTimer');
  if (timerElement) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timerElement.textContent = `Time: ${timeString}`;
    
    // Change color based on time remaining
    if (timeRemaining <= 5) {
      timerElement.style.color = '#ff4136'; // Red when time is low
    } else if (timeRemaining <= 10) {
      timerElement.style.color = '#ffd700'; // Yellow when time is medium
    } else {
      timerElement.style.color = '#fff'; // White when time is good
    }
  }
}

function resetGameState() {
  secretNumber = generateSecretNumber();
  guessInput = '';
  correctDigits = [null, null, null, null, null];
  guessHistory = [];
  currentGuesses = 0;
  numberKnowledge = Array(10).fill(null);
}

function getGuessFeedback(guess, secret) {
  const feedback = Array(mode).fill(0);
  const secretArr = secret.split('');
  const guessArr = guess.split('');
  const usedSecret = Array(mode).fill(false);
  const usedGuess = Array(mode).fill(false);
  for (let i = 0; i < mode; i++) {
    if (guessArr[i] === secretArr[i]) {
      feedback[i] = 2;
      usedSecret[i] = true;
      usedGuess[i] = true;
    }
  }
  for (let i = 0; i < mode; i++) {
    if (!usedGuess[i]) {
      for (let j = 0; j < mode; j++) {
        if (!usedSecret[j] && guessArr[i] === secretArr[j]) {
          feedback[i] = 1;
          usedSecret[j] = true;
          usedGuess[i] = true;
          break;
        }
      }
    }
  }
  return feedback;
}

function updateNumberKnowledge(guess, feedbackArr) {
  for (let i = 0; i < mode; i++) {
    const digit = Number(guess[i]);
    if (feedbackArr[i] === 2) {
      numberKnowledge[digit] = 'green';
    } else if (feedbackArr[i] === 1 && numberKnowledge[digit] !== 'green') {
      numberKnowledge[digit] = 'yellow';
    } else if (feedbackArr[i] === 0 && numberKnowledge[digit] !== 'green' && numberKnowledge[digit] !== 'yellow') {
      numberKnowledge[digit] = 'red';
    }
  }
}

function renderStatsBar() {
  const stats = window.StatsSystem.getStats(false, mode);
  return `<div style="position: absolute; top: 20px; right: 20px; background: rgba(30,30,30,0.95); 
              border-radius: 15px; padding: 1.5rem 2rem; box-shadow: 0 2px 24px #000a; z-index: 10;">
    <div style="font-size: 1.8rem; color: #fff; margin-bottom: 1rem; font-weight: bold;">Stats</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Games: ${stats.gamesPlayed}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Total Guesses: ${stats.totalGuesses}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Best: ${stats.bestGuesses || 'N/A'}</div>
    <div style="color: #ccc;">Average: ${stats.averageGuesses || 'N/A'}</div>
  </div>`;
}

function renderNumberTablet() {
  const colorMap = {
    green: '#2ecc40',
    yellow: '#ffd700',
    red: '#ff4136',
    null: '#888'
  };
  return `<div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(30,30,30,0.95); border-radius: 28px; padding: 2rem 3.5rem; box-shadow: 0 2px 24px #000a; display: flex; flex-direction: row; align-items: center; gap: 2.2rem; z-index: 10;">
    ${Array.from({length: 10}, (_, d) => `<span style="display: block; width: 5.5rem; height: 5.5rem; border-radius: 50%; background: ${colorMap[numberKnowledge[d]]}; color: #fff; font-size: 3.5rem; line-height: 5.5rem; text-align: center; font-weight: bold; box-shadow: 0 0 18px ${colorMap[numberKnowledge[d]]};">${d}</span>`).join('')}
  </div>`;
}

function renderGuessHistory() {
  if (guessHistory.length === 0) return '';
  const colorMap = ['#ff4136', '#ffd700', '#2ecc40'];
  return `<div style="position: absolute; bottom: 40px; left: 40px; background: rgba(30,30,30,0.95); border-radius: 28px; padding: 2rem 2.5rem; box-shadow: 0 2px 24px #000a; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; z-index: 10; max-width: 300px;">
    <div style='font-size:1.8rem; color:#fff; margin-bottom:1rem; font-weight:bold;'>Guesses</div>
    ${guessHistory.map(({guess, feedback}) =>
      `<div style='display:flex; gap:0.8rem;'>${Array.from({length: mode}, (_, i) =>
        `<span style='display:inline-block; width:3.5rem; height:3.5rem; border-radius:0.8rem; background:${colorMap[feedback[i]]}; color:#fff; font-size:2.5rem; text-align:center; line-height:3.5rem; font-weight:bold;'>${guess[i]}</span>`
      ).join('')}</div>`
    ).join('')}
  </div>`;
}

function renderGameUI(feedbackArr = null) {
  const feedbackLights = feedbackArr ? feedbackArr.map(f => 
    f === 2 ? '🟢' : f === 1 ? '🟡' : '🔴'
  ).join('') : '';
  
  const correctDigitsDisplay = correctDigits.slice(0, mode).map(d => d !== null ? d : '_').join('');
  
  gameScreen.innerHTML = `
    <button id="lobbyBtn" class="top-left">Lobby</button>
    ${renderStatsBar()}
    <div id="gameTimer" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); 
                color: #fff; font-size: 2rem; font-weight: bold; z-index: 10;">Time: 0:00</div>
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
      <div style="font-size: 2.5rem; color: #fff; margin-bottom: 2rem;">Guess the ${mode}-digit number!</div>
      <div style="font-size: 1.8rem; color: #fff; margin-bottom: 2rem;">Guesses: ${currentGuesses}</div>
      <div style="margin-bottom: 2rem;">
        <input id="guessInput" type="text" maxlength="${mode}" style="font-size:3rem; padding:1rem 2rem; text-align:center; width: ${mode * 4}rem; border-radius: 1rem; border: none; outline: none;" autocomplete="off" />
      </div>
      <div id="feedbackLights" style="font-size: 2rem; margin-bottom: 1rem;">${feedbackLights}</div>
      <div id="correctDigits" style="font-size: 1.5rem; color: #2ecc40; margin-bottom: 2rem;">${correctDigitsDisplay}</div>
      <div id="feedbackDiv" style="color: #fff; font-size: 1.5rem; margin-top: 1rem;"></div>
    </div>
    ${renderNumberTablet()}
    ${renderGuessHistory()}
  `;
  
  feedbackDiv = document.getElementById('feedbackDiv');
  document.getElementById('lobbyBtn').addEventListener('click', () => { 
    stopTimer(); // Stop timer when returning to lobby
    showLobbyScreen(); 
  });
  
  const input = document.getElementById('guessInput');
  input.focus();
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, mode);
  });
}

function showGameScreen(selectedMode) {
  // Stop any existing timer first
  stopTimer();
  
  mode = selectedMode;
  resetGameState();
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  renderGameUI();
  startTimer(); // Start the timer when game begins
}

function handleNormalGameKeydown(e) {
  if (!gameScreen.classList.contains('hidden')) {
    const input = document.getElementById('guessInput');
    if (e.key === 'Enter' && input.value.length === mode) {
      const guess = input.value;
      const feedbackArr = getGuessFeedback(guess, secretNumber);
      
      // Update correct digits
      feedbackArr.forEach((feedback, i) => {
        if (feedback === 2) {
          correctDigits[i] = guess[i];
        }
      });
      
      // Update number knowledge
      updateNumberKnowledge(guess, feedbackArr);
      
      // Add to history
      guessHistory.push({guess, feedback: feedbackArr.slice()});
      
      currentGuesses++;
      renderGameUI(feedbackArr);
      
      if (guess === secretNumber) {
        stopTimer(); // Stop timer when game is won
        
        // Play winning sound
        if (window.soundSystem) {
          window.soundSystem.playWinningSound();
        }
        
        const coinsEarned = window.StatsSystem.calculateCoins('normal', mode, currentGuesses, true);
        window.StatsSystem.addCoins(coinsEarned);
        feedbackDiv.textContent = `Correct! +${coinsEarned} coins`;
        window.StatsSystem.updateStats(false, mode, currentGuesses);
        window.AchievementsSystem.checkAchievements('normal', mode, currentGuesses);
        setTimeout(() => {
          generateSecretNumber();
          resetGameState();
          renderGameUI();
          startTimer(); // Start new timer for next game
        }, 2000);
      } else {
        input.value = '';
        input.focus();
      }
    }
  }
}

// Export functions for use in main game.js
window.NormalGame = {
  showGameScreen,
  handleNormalGameKeydown
}; 