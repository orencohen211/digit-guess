// Reverse Guessing Game (AI guesses player's number)
let reverseMode = false;
let reverseDigitCount = 4;
let reversePossibleNumbers = [];
let reverseAIGuess = '';
let reverseHistory = [];
let reverseSecret = '';

function showReverseGuessingPrompt() {
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  reverseMode = true;
  gameScreen.innerHTML = `
    <button id="lobbyBtn" class="top-left">Lobby</button>
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
      <div style="font-size: 2.5rem; color: #fff; margin-bottom: 2rem;">How many digits is your number?</div>
      <button id="reverse3" style="font-size:2rem; margin: 1rem; padding: 1rem 2rem;">3</button>
      <button id="reverse4" style="font-size:2rem; margin: 1rem; padding: 1rem 2rem;">4</button>
      <button id="reverse5" style="font-size:2rem; margin: 1rem; padding: 1rem 2rem;">5</button>
    </div>
  `;
  document.getElementById('lobbyBtn').addEventListener('click', showLobbyScreen);
  document.getElementById('reverse3').onclick = () => showReverseNumberInput(3);
  document.getElementById('reverse4').onclick = () => showReverseNumberInput(4);
  document.getElementById('reverse5').onclick = () => showReverseNumberInput(5);
}

function showReverseNumberInput(digits) {
  reverseDigitCount = digits;
  gameScreen.innerHTML = `
    <button id="lobbyBtn" class="top-left">Lobby</button>
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
      <div style="font-size: 2.2rem; color: #fff; margin-bottom: 2rem;">Enter your secret ${digits}-digit number:</div>
      <input id="reverseSecretInput" type="text" maxlength="${digits}" style="font-size:2.5rem; padding:0.5rem 1.5rem; text-align:center; width: 10rem; border-radius: 0.5rem; border: none; outline: none;" autocomplete="off" />
      <div id="reverseInputError" style="color:#ff4136; margin-top:1rem; font-size:1.2rem;"></div>
      <button id="reverseStartBtn" style="font-size:1.5rem; margin-top:2rem; padding:0.7rem 2.5rem;">Start</button>
    </div>
  `;
  document.getElementById('lobbyBtn').addEventListener('click', showLobbyScreen);
  document.getElementById('reverseStartBtn').onclick = () => {
    const val = document.getElementById('reverseSecretInput').value;
    if (!/^\d+$/.test(val) || val.length !== digits || val[0] === '0') {
      document.getElementById('reverseInputError').textContent = `Please enter a valid ${digits}-digit number (no leading zeros).`;
      return;
    }
    reverseSecret = val;
    startReverseGuessing(digits);
  };
}

function startReverseGuessing(digits) {
  reverseDigitCount = digits;
  reversePossibleNumbers = [];
  reverseHistory = [];
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  for (let n = min; n <= max; n++) {
    reversePossibleNumbers.push(n.toString());
  }
  makeAIGuess();
}

function makeAIGuess() {
  // Check if AI has run out of guesses (6 guesses limit)
  if (reverseHistory.length >= 6) {
    updateStats(false, reverseDigitCount, reverseHistory.length);
    
    // Play loss sound
    if (window.soundSystem) {
      window.soundSystem.playLossSound();
    }
    
    setTimeout(() => renderReverseUI(`Game over! I couldn't guess your number in 6 tries. Your number was ${reverseSecret}`), 500);
    return;
  }
  
  if (reversePossibleNumbers.length === 0) {
    renderReverseUI('No possible numbers left!');
    return;
  }
  reverseAIGuess = reversePossibleNumbers[Math.floor(Math.random() * reversePossibleNumbers.length)];
  const feedback = getGuessFeedback(reverseAIGuess, reverseSecret);
  reverseHistory.push({guess: reverseAIGuess, feedback: feedback.slice()});
  renderReverseUI();
  if (feedback.every(f => f === 2)) {
    updateStats(true, reverseDigitCount, reverseHistory.length);
    // Check for achievements
    AchievementsSystem.checkAchievements('reverse', reverseDigitCount, reverseHistory.length);
    
    // Play winning sound
    if (window.soundSystem) {
      window.soundSystem.playWinningSound();
    }
    
    setTimeout(() => renderReverseUI('Yay! I guessed your number!'), 500);
    return;
  }
  reversePossibleNumbers = reversePossibleNumbers.filter(num => {
    const fb = getGuessFeedback(reverseAIGuess, num);
    return fb.every((f, i) => f === feedback[i]);
  });
  setTimeout(makeAIGuess, 700);
}

function renderReverseUI(message = '') {
  let guessBoxes = reverseAIGuess.split('').map((d, i) =>
    `<span style="display:inline-block;width:3.5rem;height:3.5rem;line-height:3.5rem;font-size:2.5rem;text-align:center;background:#222;color:#fff;border-radius:0.5rem;margin:0 0.5rem;">${d}</span>`
  ).join('');
  let historyHTML = '';
  if (reverseHistory.length > 0) {
    historyHTML = '<div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(30,30,30,0.95); border-radius: 28px; padding: 2rem 2.5rem; box-shadow: 0 2px 24px #000a; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; z-index: 10; max-width: 400px;"><b style="color:#fff;font-size:1.5rem; margin-bottom:1rem;">AI Guesses:</b>' +
      reverseHistory.map(({guess, feedback}) =>
        `<div style='margin:0.5rem 0;'>${guess.split('').map((d, i) => {
          let c = feedback[i] === 2 ? '#2ecc40' : feedback[i] === 1 ? '#ffd700' : '#ff4136';
          return `<span style='display:inline-block;width:2.5rem;height:2.5rem;line-height:2.5rem;font-size:1.7rem;text-align:center;background:${c};color:#fff;border-radius:0.5rem;margin:0 0.2rem;'>${d}</span>`;
        }).join('')}</div>`
      ).join('') + '</div>';
  }
  const remainingGuesses = 6 - reverseHistory.length;
  gameScreen.innerHTML = `
    <button id="lobbyBtn" class="top-left">Lobby</button>
    ${renderReverseStatsBar()}
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
      <div style="font-size: 2.2rem; color: #fff; margin-bottom: 1.5rem;">My guess:</div>
      <div style="margin-bottom: 1.5rem;">${guessBoxes}</div>
      <div style="font-size: 1.5rem; color: #ccc; margin-bottom: 1rem;">Guesses remaining: ${remainingGuesses}</div>
      <div style="color:#fff;margin-top:1.5rem;font-size:1.3rem;">${message}</div>
    </div>
    ${historyHTML}
  `;
  document.getElementById('lobbyBtn').addEventListener('click', () => { reverseMode = false; showLobbyScreen(); });
}

function renderReverseStatsBar() {
  const stats = window.StatsSystem.getStats(true, reverseDigitCount);
  return `<div style="position: absolute; top: 20px; right: 20px; background: rgba(30,30,30,0.95); 
              border-radius: 15px; padding: 1.5rem 2rem; box-shadow: 0 2px 24px #000a; z-index: 10;">
    <div style="font-size: 1.8rem; color: #fff; margin-bottom: 1rem; font-weight: bold;">Reverse Stats</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Games: ${stats.gamesPlayed}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Total Guesses: ${stats.totalGuesses}</div>
    <div style="color: #ccc; margin-bottom: 0.5rem;">Best: ${stats.bestGuesses || 'N/A'}</div>
    <div style="color: #ccc;">Average: ${stats.averageGuesses || 'N/A'}</div>
  </div>`;
}

// Export functions for use in main game.js
window.ReverseGame = {
  showReverseGuessingPrompt
}; 