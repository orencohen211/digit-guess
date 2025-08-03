// Multiplayer System for 1v1 Games
class MultiplayerSystem {
  constructor() {
    this.db = window.FirebaseApp ? window.FirebaseApp.db : null;
    this.rtdb = null; // Realtime Database
    this.currentGame = null;
    this.isHost = false;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.opponent = null;
    this.gameMode = 4; // Default 4-digit
    this.secretNumber = '';
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameStartTime = null;
    this.timeLimit = 30;
    
    this.initializeRealtimeDB();
  }

  initializeRealtimeDB() {
    console.log('Initializing Realtime Database...');
    console.log('window.FirebaseApp:', window.FirebaseApp);
    
    if (window.FirebaseApp && window.FirebaseApp.rtdb) {
      this.rtdb = window.FirebaseApp.rtdb;
      console.log('Realtime Database initialized successfully');
      
      // Test the connection
      this.testRealtimeDBConnection();
    } else {
      console.error('Realtime Database not available - please enable it in Firebase console');
      console.log('FirebaseApp:', window.FirebaseApp);
      console.log('rtdb:', window.FirebaseApp ? window.FirebaseApp.rtdb : 'undefined');
      // Show error message to user
      this.showRealtimeDBError();
    }
  }

  async testRealtimeDBConnection() {
    if (!this.rtdb) return;
    
    try {
      console.log('Testing Realtime Database connection...');
      const testRef = this.rtdb.ref('test');
      await testRef.set({ timestamp: Date.now() });
      console.log('Realtime Database connection test successful');
      await testRef.remove(); // Clean up test data
    } catch (error) {
      console.error('Realtime Database connection test failed:', error);
      this.rtdb = null; // Mark as unavailable
    }
  }

  showRealtimeDBError() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    console.log('showRealtimeDBError called');
    console.log('lobbyScreen:', lobbyScreen);
    console.log('gameScreen:', gameScreen);
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    const errorHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">⚠️ Setup Required</h2>
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #ffd700;">
          Firebase Realtime Database needs to be enabled for multiplayer games.
        </div>
        <div style="font-size: 1rem; color: #ccc; margin-bottom: 2rem; text-align: left; max-width: 500px;">
          <div style="margin-bottom: 1rem;"><strong>To enable multiplayer:</strong></div>
          <div style="margin-bottom: 0.5rem;">1. Go to your Firebase Console</div>
          <div style="margin-bottom: 0.5rem;">2. Select your project</div>
          <div style="margin-bottom: 0.5rem;">3. Go to "Realtime Database" in the left sidebar</div>
          <div style="margin-bottom: 0.5rem;">4. Click "Create Database"</div>
          <div style="margin-bottom: 0.5rem;">5. Choose a location and start in test mode</div>
          <div style="margin-bottom: 0.5rem;">6. Refresh this page</div>
        </div>
        <div style="font-size: 0.9rem; color: #999;">
          Multiplayer games will be available once Realtime Database is enabled.
        </div>
      </div>
    `;

    console.log('Setting error HTML');
    gameScreen.innerHTML = errorHTML;
    console.log('Error HTML set');

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      console.log('Error screen lobby button clicked');
      this.showLobbyScreen();
    });
  }

  // Test function to verify basic functionality
  testMultiplayer() {
    console.log('Testing multiplayer functionality...');
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    console.log('lobbyScreen:', lobbyScreen);
    console.log('gameScreen:', gameScreen);
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    const testHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🧪 Test Screen</h2>
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #4CAF50;">
          If you can see this, the screen switching works!
        </div>
        <div style="font-size: 1rem; color: #ccc;">
          This is a test to verify the multiplayer system is working.
        </div>
      </div>
    `;

    console.log('Setting test HTML');
    gameScreen.innerHTML = testHTML;
    console.log('Test HTML set');

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      console.log('Test screen lobby button clicked');
      this.showLobbyScreen();
    });
  }

  // Test Realtime Database connection manually
  async testRealtimeDB() {
    console.log('=== MANUAL REALTIME DATABASE TEST ===');
    console.log('1. Checking Firebase initialization...');
    console.log('window.FirebaseApp:', window.FirebaseApp);
    console.log('window.FirebaseApp.rtdb:', window.FirebaseApp ? window.FirebaseApp.rtdb : 'undefined');
    console.log('this.rtdb:', this.rtdb);
    
    console.log('2. Checking Firebase SDK...');
    console.log('firebase:', typeof firebase);
    console.log('firebase.database:', typeof firebase.database);
    
    console.log('3. Checking authentication...');
    console.log('window.authSystem:', window.authSystem);
    console.log('User signed in:', window.authSystem ? window.authSystem.isSignedIn() : 'No auth system');
    
    if (!this.rtdb) {
      console.error('❌ Realtime Database is not available');
      console.log('Possible issues:');
      console.log('- Firebase Realtime Database not enabled in console');
      console.log('- Wrong database URL in config');
      console.log('- Firebase SDK not loaded properly');
      alert('Realtime Database is not available. Check console for details.');
      return;
    }
    
    console.log('4. Testing connection...');
    try {
      const testRef = this.rtdb.ref('test');
      console.log('Test ref created:', testRef);
      
      const testData = { timestamp: Date.now(), test: 'manual', user: 'test' };
      console.log('Setting test data:', testData);
      
      await testRef.set(testData);
      console.log('✅ Test data set successfully');
      
      const snapshot = await testRef.once('value');
      console.log('✅ Test data read successfully:', snapshot.val());
      
      await testRef.remove();
      console.log('✅ Test data cleaned up');
      
      alert('✅ Realtime Database connection successful!');
    } catch (error) {
      console.error('❌ Manual test failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('❌ Realtime Database connection failed: ' + error.message);
    }
  }

  // Comprehensive system check
  async checkSystemStatus() {
    console.log('=== COMPREHENSIVE SYSTEM CHECK ===');
    
    // Check Firebase
    console.log('Firebase Status:');
    console.log('- Firebase object:', typeof firebase);
    console.log('- Firebase config:', firebase.app().options);
    
    // Check Realtime Database
    console.log('Realtime Database Status:');
    console.log('- rtdb object:', this.rtdb);
    console.log('- rtdb type:', typeof this.rtdb);
    
    // Check Authentication
    console.log('Authentication Status:');
    console.log('- Auth system:', window.authSystem);
    console.log('- User signed in:', window.authSystem ? window.authSystem.isSignedIn() : false);
    console.log('- Current user:', window.authSystem ? window.authSystem.getCurrentUser() : null);
    
    // Check DOM elements
    console.log('DOM Elements:');
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    console.log('- Lobby screen:', lobbyScreen);
    console.log('- Game screen:', gameScreen);
    
    // Check window objects
    console.log('Window Objects:');
    console.log('- FirebaseApp:', window.FirebaseApp);
    console.log('- multiplayerSystem:', window.multiplayerSystem);
    console.log('- StatsSystem:', window.StatsSystem);
    console.log('- AchievementsSystem:', window.AchievementsSystem);
    
    return {
      firebase: typeof firebase !== 'undefined',
      rtdb: this.rtdb !== null,
      auth: window.authSystem !== null,
      signedIn: window.authSystem ? window.authSystem.isSignedIn() : false,
      domElements: lobbyScreen && gameScreen
    };
  }

  async createGame(gameMode = 4) {
    if (!this.rtdb || !window.authSystem || !window.authSystem.isSignedIn()) {
      alert('Please sign in to play multiplayer games!');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    this.gameMode = gameMode;
    this.isHost = true;
    this.secretNumber = this.generateSecretNumber(gameMode);
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameState = 'waiting';
    this.gameStartTime = null;
    this.timeLimit = this.getTimeLimit(gameMode);

    const gameId = `game_${Date.now()}_${user.uid}`;
    this.currentGame = gameId;

    const gameData = {
      host: {
        uid: user.uid,
        username: userProfile ? userProfile.username : user.email.split('@')[0],
        secretNumber: this.secretNumber,
        guesses: [],
        ready: false
      },
      guest: {
        uid: null,
        username: null,
        secretNumber: null,
        guesses: [],
        ready: false
      },
      gameMode: gameMode,
      timeLimit: this.timeLimit,
      state: 'waiting', // waiting, playing, finished
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    try {
      await this.rtdb.ref(`games/${gameId}`).set(gameData);
      console.log('Game created:', gameId);
      this.showMultiplayerLobby();
    } catch (error) {
      console.error('Create game error:', error);
      alert('Failed to create game. Please try again.');
    }
  }

  async joinGame(gameId) {
    if (!this.rtdb || !window.authSystem || !window.authSystem.isSignedIn()) {
      alert('Please sign in to play multiplayer games!');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();

    this.currentGame = gameId;
    this.isHost = false;
    this.secretNumber = this.generateSecretNumber(this.gameMode);
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameState = 'waiting';

    const guestData = {
      uid: user.uid,
      username: userProfile ? userProfile.username : user.email.split('@')[0],
      secretNumber: this.secretNumber,
      guesses: [],
      ready: false
    };

    try {
      await this.rtdb.ref(`games/${gameId}/guest`).set(guestData);
      console.log('Joined game:', gameId);
      this.listenToGameUpdates();
    } catch (error) {
      console.error('Join game error:', error);
      alert('Failed to join game. Please try again.');
    }
  }

  async findAvailableGames() {
    if (!this.rtdb) return [];

    try {
      const snapshot = await this.rtdb.ref('games')
        .orderByChild('state')
        .equalTo('waiting')
        .once('value');

      const games = [];
      snapshot.forEach((childSnapshot) => {
        const game = childSnapshot.val();
        const gameId = childSnapshot.key;
        
        // Don't show games created by current user
        if (game.host.uid !== window.authSystem.getCurrentUser().uid) {
          games.push({
            id: gameId,
            host: game.host.username,
            gameMode: game.gameMode,
            createdAt: game.createdAt
          });
        }
      });

      return games.sort((a, b) => b.createdAt - a.createdAt); // Newest first
    } catch (error) {
      console.error('Find games error:', error);
      return [];
    }
  }

  async setReady() {
    if (!this.rtdb || !this.currentGame) return;

    const user = window.authSystem.getCurrentUser();
    const path = this.isHost ? 'host/ready' : 'guest/ready';
    
    try {
      await this.rtdb.ref(`games/${this.currentGame}/${path}`).set(true);
    } catch (error) {
      console.error('Set ready error:', error);
    }
  }

  async startGame() {
    if (!this.rtdb || !this.currentGame) return;

    try {
      await this.rtdb.ref(`games/${this.currentGame}/state`).set('playing');
      await this.rtdb.ref(`games/${this.currentGame}/gameStartTime`).set(Date.now());
    } catch (error) {
      console.error('Start game error:', error);
    }
  }

  async submitGuess(guess) {
    if (!this.rtdb || !this.currentGame || this.gameState !== 'playing') return;

    const user = window.authSystem.getCurrentUser();
    const path = this.isHost ? 'host/guesses' : 'guest/guesses';
    
    const guessData = {
      guess: guess,
      timestamp: Date.now(),
      feedback: this.getGuessFeedback(guess, this.secretNumber)
    };

    try {
      const guessesRef = this.rtdb.ref(`games/${this.currentGame}/${path}`);
      const newGuessRef = guessesRef.push();
      await newGuessRef.set(guessData);
      
      this.myGuesses.push(guessData);
    } catch (error) {
      console.error('Submit guess error:', error);
    }
  }

  listenToGameUpdates() {
    if (!this.rtdb || !this.currentGame) return;

    this.rtdb.ref(`games/${this.currentGame}`).on('value', (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) {
        console.log('Game ended or not found');
        this.leaveGame();
        return;
      }

      this.handleGameUpdate(gameData);
    });
  }

  handleGameUpdate(gameData) {
    // Update game state
    this.gameState = gameData.state;
    
    // Update opponent data
    const opponentData = this.isHost ? gameData.guest : gameData.host;
    if (opponentData) {
      this.opponent = {
        username: opponentData.username,
        guesses: opponentData.guesses || []
      };
      this.opponentGuesses = opponentData.guesses || [];
    }

    // Check if both players are ready
    if (gameData.state === 'waiting' && gameData.host.ready && gameData.guest.ready) {
      this.startGame();
    }

    // Update UI based on game state
    if (gameData.state === 'playing' && !this.gameStartTime) {
      this.gameStartTime = gameData.gameStartTime;
      this.showMultiplayerGame();
    }

    // Check for game end
    if (gameData.state === 'finished') {
      this.showGameResults(gameData);
    }
  }

  async leaveGame() {
    if (!this.rtdb || !this.currentGame) return;

    try {
      if (this.isHost) {
        // Host leaving - delete the game
        await this.rtdb.ref(`games/${this.currentGame}`).remove();
      } else {
        // Guest leaving - clear guest data
        await this.rtdb.ref(`games/${this.currentGame}/guest`).remove();
      }
      
      this.currentGame = null;
      this.gameState = 'waiting';
      this.showLobbyScreen();
    } catch (error) {
      console.error('Leave game error:', error);
    }
  }

  generateSecretNumber(digits) {
    let num = '';
    for (let i = 0; i < digits; i++) {
      num += Math.floor(Math.random() * 10);
    }
    return num;
  }

  getTimeLimit(digits) {
    switch (digits) {
      case 3: return 20;
      case 4: return 30;
      case 5: return 40;
      default: return 30;
    }
  }

  getGuessFeedback(guess, secret) {
    const feedback = [];
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    
    for (let i = 0; i < guessArr.length; i++) {
      if (guessArr[i] === secretArr[i]) {
        feedback.push(2); // Green - correct position
      } else if (secretArr.includes(guessArr[i])) {
        feedback.push(1); // Yellow - wrong position
      } else {
        feedback.push(0); // Red - not in number
      }
    }
    
    return feedback;
  }

  showMultiplayerLobby() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    const gameId = this.currentGame;
    const shareLink = `${window.location.origin}${window.location.pathname}?game=${gameId}`;

    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 Multiplayer Game</h2>
        <div style="font-size: 1.5rem; margin-bottom: 1rem;">Game ID: ${gameId}</div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #ccc;">Share this link with your friend:</div>
        <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin-bottom: 2rem; word-break: break-all;">
          ${shareLink}
        </div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem;">
          <div>👤 You: ${window.authSystem.getUserProfile()?.username || 'Player'}</div>
          <div id="opponentStatus" style="color: #ccc;">⏳ Waiting for opponent...</div>
        </div>
        <button id="readyBtn" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer;">I'm Ready!</button>
      </div>
    `;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    document.getElementById('readyBtn').addEventListener('click', () => {
      this.setReady();
      document.getElementById('readyBtn').disabled = true;
      document.getElementById('readyBtn').textContent = 'Ready!';
    });

    this.listenToGameUpdates();
  }

  showMultiplayerGame() {
    const gameScreen = document.getElementById('gameScreen');
    
    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Leave Game</button>
      <div id="gameTimer" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 2rem; font-weight: bold;">Time: 0:00</div>
      
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 1v1 ${this.gameMode}-Digit Challenge</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 2rem;">
          <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 15px;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">You</h3>
            <div style="font-size: 1.2rem; margin-bottom: 1rem;">Guesses: ${this.myGuesses.length}</div>
            <div id="myGuesses" style="font-size: 1rem; max-height: 200px; overflow-y: auto;"></div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 15px;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${this.opponent?.username || 'Opponent'}</h3>
            <div style="font-size: 1.2rem; margin-bottom: 1rem;">Guesses: ${this.opponentGuesses.length}</div>
            <div id="opponentGuesses" style="font-size: 1rem; max-height: 200px; overflow-y: auto;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 2rem;">
          <input id="guessInput" type="text" maxlength="${this.gameMode}" 
                 style="font-size: 2rem; padding: 1rem; text-align: center; width: ${this.gameMode * 3}rem; 
                        border-radius: 10px; border: none; outline: none;" 
                 placeholder="Enter your guess" autocomplete="off" />
        </div>
        
        <div id="feedbackDiv" style="color: #fff; font-size: 1.5rem; margin-top: 1rem;"></div>
      </div>
    `;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    const input = document.getElementById('guessInput');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.length === this.gameMode) {
        this.handleGuess(input.value);
        input.value = '';
        input.focus();
      }
    });

    this.startGameTimer();
    this.updateGuessesDisplay();
  }

  async handleGuess(guess) {
    if (this.gameState !== 'playing') return;

    await this.submitGuess(guess);
    this.updateGuessesDisplay();
    
    // Check if player won
    if (guess === this.secretNumber) {
      this.endGame(true);
    }
  }

  updateGuessesDisplay() {
    const myGuessesDiv = document.getElementById('myGuesses');
    const opponentGuessesDiv = document.getElementById('opponentGuesses');
    
    if (myGuessesDiv) {
      myGuessesDiv.innerHTML = this.myGuesses.map(g => 
        `<div style="margin: 0.5rem 0;">${g.guess} ${this.getFeedbackEmojis(g.feedback)}</div>`
      ).join('');
    }
    
    if (opponentGuessesDiv) {
      opponentGuessesDiv.innerHTML = this.opponentGuesses.map(g => 
        `<div style="margin: 0.5rem 0;">${g.guess} ${this.getFeedbackEmojis(g.feedback)}</div>`
      ).join('');
    }
  }

  getFeedbackEmojis(feedback) {
    return feedback.map(f => f === 2 ? '🟢' : f === 1 ? '🟡' : '🔴').join('');
  }

  startGameTimer() {
    if (!this.gameStartTime) return;
    
    const timerElement = document.getElementById('gameTimer');
    if (!timerElement) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const remaining = Math.max(0, this.timeLimit - elapsed);
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      timerElement.textContent = `Time: ${timeString}`;
      
      if (remaining <= 5) {
        timerElement.style.color = '#ff4136';
      } else if (remaining <= 10) {
        timerElement.style.color = '#ffd700';
      } else {
        timerElement.style.color = '#fff';
      }
      
      if (remaining <= 0) {
        this.endGame(false);
        return;
      }
      
      setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
  }

  async endGame(playerWon) {
    if (!this.rtdb || !this.currentGame) return;

    try {
      await this.rtdb.ref(`games/${this.currentGame}/state`).set('finished');
      await this.rtdb.ref(`games/${this.currentGame}/winner`).set(playerWon ? 'player' : 'opponent');
      await this.rtdb.ref(`games/${this.currentGame}/endTime`).set(Date.now());
    } catch (error) {
      console.error('End game error:', error);
    }
  }

  showGameResults(gameData) {
    const gameScreen = document.getElementById('gameScreen');
    const winner = gameData.winner;
    const isWinner = (winner === 'player' && this.isHost) || (winner === 'opponent' && !this.isHost);
    
    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 3rem; margin-bottom: 2rem;">${isWinner ? '🏆 You Won!' : '😔 You Lost!'}</h2>
        <div style="font-size: 1.5rem; margin-bottom: 2rem;">
          <div>Your secret number: ${this.secretNumber}</div>
          <div>Opponent's secret number: ${this.opponent?.secretNumber || 'Unknown'}</div>
        </div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem;">
          <div>Your guesses: ${this.myGuesses.length}</div>
          <div>Opponent's guesses: ${this.opponentGuesses.length}</div>
        </div>
        <button id="newGameBtn" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer; margin-right: 1rem;">New Game</button>
        <button id="lobbyBtn2" style="font-size: 1.5rem; padding: 1rem 2rem; background: #666; color: white; border: none; border-radius: 10px; cursor: pointer;">Back to Lobby</button>
      </div>
    `;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    document.getElementById('lobbyBtn2').addEventListener('click', () => {
      this.leaveGame();
    });

    document.getElementById('newGameBtn').addEventListener('click', () => {
      this.leaveGame();
      setTimeout(() => this.createGame(this.gameMode), 500);
    });
  }

  showLobbyScreen() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
  }

  async showMultiplayerMenu() {
    console.log('showMultiplayerMenu called');
    console.log('this.rtdb:', this.rtdb);
    
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    console.log('lobbyScreen:', lobbyScreen);
    console.log('gameScreen:', gameScreen);
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // Check if Realtime Database is available
    if (!this.rtdb) {
      console.log('Realtime Database not available, showing setup instructions');
      const setupHTML = `
        <button id="lobbyBtn" class="top-left">Back to Lobby</button>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
          <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 1v1 Multiplayer</h2>
          
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #ffd700;">Setup Required</h3>
            <div style="font-size: 1rem; color: #ccc; margin-bottom: 2rem; text-align: left; max-width: 500px;">
              <div style="margin-bottom: 1rem;"><strong>To enable multiplayer:</strong></div>
              <div style="margin-bottom: 0.5rem;">1. Go to your Firebase Console</div>
              <div style="margin-bottom: 0.5rem;">2. Select your project</div>
              <div style="margin-bottom: 0.5rem;">3. Go to "Realtime Database" in the left sidebar</div>
              <div style="margin-bottom: 0.5rem;">4. Click "Create Database"</div>
              <div style="margin-bottom: 0.5rem;">5. Choose a location and start in test mode</div>
              <div style="margin-bottom: 0.5rem;">6. Refresh this page</div>
            </div>
          </div>
          
          <button onclick="window.multiplayerSystem.testRealtimeDB()" 
                  style="padding: 1rem 2rem; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 1rem;">
            🔧 Test Realtime Database Connection
          </button>
          
          <button onclick="window.multiplayerSystem.checkSystemStatus()" 
                  style="padding: 1rem 2rem; background: #e74c3c; color: white; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 1rem;">
            🔍 Run System Check
          </button>
          
          <div style="font-size: 1rem; color: #ccc; margin-top: 2rem;">
            <div>• Both players must be signed in</div>
            <div>• Share the game link with your friend</div>
            <div>• First to guess the opponent's number wins!</div>
          </div>
        </div>
      `;
      
      console.log('Setting setup HTML');
      gameScreen.innerHTML = setupHTML;
      console.log('Setup HTML set');
    } else {
      console.log('Realtime Database available, showing full menu');
      // Get available games
      console.log('Finding available games...');
      const availableGames = await this.findAvailableGames();
      console.log('Available games:', availableGames);

      let gamesHTML = '';
      if (availableGames.length > 0) {
        gamesHTML = `
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #fff;">Available Games:</h3>
            <div style="max-height: 300px; overflow-y: auto;">
        `;
        
        availableGames.forEach(game => {
          const timeAgo = this.getTimeAgo(game.createdAt);
          gamesHTML += `
            <div style="background: rgba(255,255,255,0.1); padding: 1rem; margin-bottom: 0.5rem; border-radius: 10px; color: #fff;">
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">Host: ${game.host}</div>
              <div style="font-size: 1rem; margin-bottom: 0.5rem;">Mode: ${game.gameMode}-digit</div>
              <div style="font-size: 0.8rem; color: #ccc;">Created: ${timeAgo}</div>
              <button onclick="window.multiplayerSystem.joinGame('${game.id}')" 
                      style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Join Game</button>
            </div>
          `;
        });
        
        gamesHTML += `
            </div>
          </div>
        `;
      }

      const menuHTML = `
        <button id="lobbyBtn" class="top-left">Back to Lobby</button>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
          <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 1v1 Multiplayer</h2>
          
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Create New Game:</h3>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
              <button onclick="window.multiplayerSystem.createGame(3)" 
                      style="padding: 1rem 2rem; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer;">3-Digit</button>
              <button onclick="window.multiplayerSystem.createGame(4)" 
                      style="padding: 1rem 2rem; background: #e74c3c; color: white; border: none; border-radius: 10px; cursor: pointer;">4-Digit</button>
              <button onclick="window.multiplayerSystem.createGame(5)" 
                      style="padding: 1rem 2rem; background: #f39c12; color: white; border: none; border-radius: 10px; cursor: pointer;">5-Digit</button>
            </div>
          </div>
          
          ${gamesHTML}
          
          <div style="font-size: 1rem; color: #ccc; margin-top: 2rem;">
            <div>• Both players must be signed in</div>
            <div>• Share the game link with your friend</div>
            <div>• First to guess the opponent's number wins!</div>
          </div>
        </div>
      `;

      console.log('Setting menu HTML');
      gameScreen.innerHTML = menuHTML;
      console.log('Menu HTML set');
    }

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      console.log('Lobby button clicked');
      this.showLobbyScreen();
    });
    
    console.log('showMultiplayerMenu completed');
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
}

// Initialize multiplayer system
let multiplayerSystem;
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing multiplayer system...');
  setTimeout(() => {
    console.log('Creating multiplayer system...');
    multiplayerSystem = new MultiplayerSystem();
    window.multiplayerSystem = multiplayerSystem;
    console.log('Multiplayer system created:', multiplayerSystem);
  }, 1000);
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('Document still loading, will initialize later');
} else {
  console.log('Document already loaded, initializing multiplayer system immediately...');
  setTimeout(() => {
    console.log('Creating multiplayer system (immediate)...');
    multiplayerSystem = new MultiplayerSystem();
    window.multiplayerSystem = multiplayerSystem;
    console.log('Multiplayer system created (immediate):', multiplayerSystem);
  }, 500);
} 