// Simple Multiplayer System - Username-based with game requests
class SimpleMultiplayerSystem {
  constructor() {
    this.db = window.FirebaseApp ? window.FirebaseApp.db : null;
    this.currentGame = null;
    this.isHost = false;
    this.gameState = 'waiting';
    this.opponent = null;
    this.gameMode = 4;
    this.secretNumber = '';
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameStartTime = null;
    this.timeLimit = 30;
    
    this.checkForGameRequests();
  }

  async sendGameRequest(targetUsername, gameMode) {
    console.log('=== SENDING GAME REQUEST ===');
    console.log('Target username:', targetUsername);
    console.log('Game mode:', gameMode);
    
    if (!this.db || !window.authSystem || !window.authSystem.isSignedIn()) {
      alert('Please sign in to send game requests!');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    if (!userProfile || !userProfile.username) {
      alert('Please set a username first!');
      return;
    }

    // Reset any existing game state
    this.resetGameState();

    const requestData = {
      from: {
        uid: user.uid,
        username: userProfile.username
      },
      to: {
        username: targetUsername
      },
      gameMode: gameMode,
      timeLimit: this.getTimeLimit(gameMode),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await this.db.collection('gameRequests').add(requestData);
      console.log('Game request sent successfully with ID:', docRef.id);
      alert(`Game request sent to ${targetUsername}!`);
    } catch (error) {
      console.error('Send game request error:', error);
      alert('Failed to send game request. Please try again.');
    }
  }

  async checkForGameRequests() {
    if (!this.db || !window.authSystem || !window.authSystem.isSignedIn()) return;

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    if (!userProfile || !userProfile.username) return;

    console.log('Setting up game request listeners for user:', user.email);

    // Listen for incoming game requests
    this.db.collection('gameRequests')
      .where('to.username', '==', userProfile.username)
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        console.log('Incoming requests snapshot:', snapshot.docs.length, 'requests');
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            console.log('New incoming request:', change.doc.data());
            this.showGameRequest(change.doc.data(), change.doc.id);
          }
        });
      });

    // Listen for accepted game requests (for the host)
    this.db.collection('gameRequests')
      .where('from.uid', '==', user.uid)
      .where('status', '==', 'accepted')
      .onSnapshot((snapshot) => {
        console.log('Accepted requests snapshot:', snapshot.docs.length, 'requests');
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            console.log('Request accepted by opponent:', change.doc.data());
            this.handleGameRequestAccepted(change.doc.data(), change.doc.id);
          }
        });
      });

    // Also listen for any changes to requests we sent
    this.db.collection('gameRequests')
      .where('from.uid', '==', user.uid)
      .onSnapshot((snapshot) => {
        console.log('All our requests snapshot:', snapshot.docs.length, 'requests');
        snapshot.docChanges().forEach((change) => {
          const requestData = change.doc.data();
          console.log('Request change:', change.type, requestData.status, requestData);
          
          if (change.type === 'modified' && requestData.status === 'accepted') {
            console.log('Request was accepted!');
            this.handleGameRequestAccepted(requestData, change.doc.id);
          }
        });
      });
  }

  async handleGameRequestAccepted(requestData, requestId) {
    console.log('=== HANDLE GAME REQUEST ACCEPTED ===');
    console.log('Request data:', requestData);
    console.log('Request ID:', requestId);
    console.log('Current game:', this.currentGame);
    
    // Check if we're already in a game
    if (this.currentGame) {
      console.log('Already in a game, ignoring accepted request');
      return;
    }

    // Reset any existing game state
    this.resetGameState();

    console.log('Joining game as host...');
    // Join the game as host
    await this.joinGameAsHost(requestData, requestId);
  }

  async joinGameAsHost(requestData, requestId) {
    console.log('=== JOIN GAME AS HOST ===');
    console.log('Request data:', requestData);
    console.log('Request ID:', requestId);
    
    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    console.log('User:', user.email);
    console.log('User profile:', userProfile);
    
    this.gameMode = requestData.gameMode;
    this.isHost = true; // The person who sent the request is the host
    this.secretNumber = this.generateSecretNumber(requestData.gameMode);
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameState = 'waiting';
    this.timeLimit = requestData.timeLimit;
    this.currentGame = requestId;

    console.log('Game state set:', {
      gameMode: this.gameMode,
      isHost: this.isHost,
      secretNumber: this.secretNumber,
      currentGame: this.currentGame
    });

    // Update the game with host data
    const hostData = {
      uid: user.uid,
      username: userProfile.username,
      secretNumber: this.secretNumber,
      guesses: [],
      ready: false
    };

    console.log('Host data to update:', hostData);

    try {
      // First, check if the game document exists
      const gameDoc = await this.db.collection('games').doc(requestId).get();
      
      if (!gameDoc.exists) {
        console.log('Game document does not exist, creating it...');
        // Create the game document with host data
        await this.db.collection('games').doc(requestId).set({
          requestId: requestId,
          host: hostData,
          gameState: 'waiting',
          createdAt: new Date().toISOString()
        });
      } else {
        console.log('Game document exists, updating host data...');
        // Update the existing game document
        await this.db.collection('games').doc(requestId).update({
          'host': hostData
        });
      }
      
      console.log('Game updated successfully');
      this.showMultiplayerLobby();
      this.listenToGameUpdates();
      
      console.log('Joined game as host successfully');
    } catch (error) {
      console.error('Join game as host error:', error);
    }
  }

  showGameRequest(requestData, requestId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.9); z-index: 2000; display: flex; 
      justify-content: center; align-items: center;
    `;

    modal.innerHTML = `
      <div style="background: #1a1a1a; border-radius: 20px; padding: 3rem; 
                  max-width: 400px; text-align: center; color: white;">
        <h2 style="font-size: 2rem; margin-bottom: 1rem;">🎮 Game Request</h2>
        <div style="font-size: 1.2rem; margin-bottom: 2rem;">
          <strong>${requestData.from.username}</strong> wants to play a ${requestData.gameMode}-digit game!
        </div>
        <div style="font-size: 1rem; color: #ccc; margin-bottom: 2rem;">
          Time limit: ${requestData.timeLimit} seconds
        </div>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="window.simpleMultiplayerSystem.acceptGameRequest('${requestId}')" 
                  style="padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer;">
            Accept
          </button>
          <button onclick="window.simpleMultiplayerSystem.declineGameRequest('${requestId}')" 
                  style="padding: 1rem 2rem; background: #ff4136; color: white; border: none; border-radius: 10px; cursor: pointer;">
            Decline
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  async acceptGameRequest(requestId) {
    console.log('=== ACCEPTING GAME REQUEST ===');
    console.log('Request ID:', requestId);
    
    try {
      // Reset any existing game state
      this.resetGameState();
      
      // Update request status
      await this.db.collection('gameRequests').doc(requestId).update({
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      // Get request data
      const requestDoc = await this.db.collection('gameRequests').doc(requestId).get();
      const requestData = requestDoc.data();

      // Create game
      await this.createGameFromRequest(requestData, requestId);
      
      // Remove the modal
      document.querySelector('div[style*="position: fixed"]').remove();
      
    } catch (error) {
      console.error('Accept game request error:', error);
      alert('Failed to accept game request.');
    }
  }

  async declineGameRequest(requestId) {
    try {
      await this.db.collection('gameRequests').doc(requestId).update({
        status: 'declined',
        declinedAt: new Date().toISOString()
      });
      
      // Remove the modal
      document.querySelector('div[style*="position: fixed"]').remove();
      
    } catch (error) {
      console.error('Decline game request error:', error);
    }
  }

  async createGameFromRequest(requestData, requestId) {
    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    this.gameMode = requestData.gameMode;
    this.isHost = false; // The person who accepts is not the host
    this.secretNumber = this.generateSecretNumber(requestData.gameMode);
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameState = 'waiting';
    this.timeLimit = requestData.timeLimit;

    const gameData = {
      requestId: requestId,
      host: {
        uid: requestData.from.uid,
        username: requestData.from.username,
        secretNumber: this.generateSecretNumber(requestData.gameMode),
        guesses: [],
        ready: false
      },
      guest: {
        uid: user.uid,
        username: userProfile.username,
        secretNumber: this.secretNumber,
        guesses: [],
        ready: false
      },
      gameMode: requestData.gameMode,
      timeLimit: requestData.timeLimit,
      state: 'waiting',
      createdAt: new Date().toISOString(),
      acceptedBy: user.uid // Track who accepted
    };

    try {
      await this.db.collection('games').doc(requestId).set(gameData);
      this.currentGame = requestId;
      this.showMultiplayerLobby();
      this.listenToGameUpdates();
    } catch (error) {
      console.error('Create game from request error:', error);
      alert('Failed to create game.');
    }
  }

  async createGame(gameMode = 4) {
    if (!this.db || !window.authSystem || !window.authSystem.isSignedIn()) {
      alert('Please sign in to create games!');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    
    if (!userProfile || !userProfile.username) {
      alert('Please set a username first!');
      return;
    }

    this.gameMode = gameMode;
    this.isHost = true;
    this.secretNumber = this.generateSecretNumber(gameMode);
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.gameState = 'waiting';
    this.timeLimit = this.getTimeLimit(gameMode);

    const gameId = `game_${Date.now()}_${user.uid}`;
    this.currentGame = gameId;

    const gameData = {
      host: {
        uid: user.uid,
        username: userProfile.username,
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
      state: 'waiting',
      createdAt: new Date().toISOString()
    };

    try {
      await this.db.collection('games').doc(gameId).set(gameData);
      this.showMultiplayerLobby();
      this.listenToGameUpdates();
    } catch (error) {
      console.error('Create game error:', error);
      alert('Failed to create game. Please try again.');
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

  // Reset function to clear all game state
  resetGameState() {
    console.log('=== RESETTING GAME STATE ===');
    
    this.currentGame = null;
    this.isHost = false;
    this.gameState = 'waiting';
    this.gameMode = 4;
    this.secretNumber = '';
    this.opponentSecretNumber = '';
    this.hostSecretNumber = '';
    this.myGuesses = [];
    this.opponentGuesses = [];
    this.opponent = null;
    this.gameStartTime = null;
    this.timeLimit = 30;
    
    console.log('Game state reset completed');
  }

  // Cleanup function to reset all old requests
  async cleanupOldRequests() {
    console.log('=== CLEANING UP OLD REQUESTS ===');
    
    if (!this.db || !window.authSystem || !window.authSystem.isSignedIn()) {
      console.log('Not signed in or no database');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    console.log('Cleaning up requests for user:', user.email);

    try {
      // Delete all requests we sent
      const ourRequests = await this.db.collection('gameRequests')
        .where('from.uid', '==', user.uid)
        .get();
      
      console.log('Deleting', ourRequests.docs.length, 'requests we sent');
      for (const doc of ourRequests.docs) {
        await doc.ref.delete();
      }

      // Delete all requests sent to us
      const requestsToUs = await this.db.collection('gameRequests')
        .where('to.uid', '==', user.uid)
        .get();
      
      console.log('Deleting', requestsToUs.docs.length, 'requests sent to us');
      for (const doc of requestsToUs.docs) {
        await doc.ref.delete();
      }

      // Delete any games we're in
      const ourGames = await this.db.collection('games')
        .where('host.uid', '==', user.uid)
        .get();
      
      console.log('Deleting', ourGames.docs.length, 'games where we are host');
      for (const doc of ourGames.docs) {
        await doc.ref.delete();
      }

      const guestGames = await this.db.collection('games')
        .where('guest.uid', '==', user.uid)
        .get();
      
      console.log('Deleting', guestGames.docs.length, 'games where we are guest');
      for (const doc of guestGames.docs) {
        await doc.ref.delete();
      }

      console.log('Cleanup completed successfully');
      alert('All old requests and games have been cleaned up!');
      
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Error during cleanup: ' + error.message);
    }
  }

  // Test function to check host notification system
  async testHostNotification() {
    console.log('=== TESTING HOST NOTIFICATION ===');
    
    if (!this.db || !window.authSystem || !window.authSystem.isSignedIn()) {
      console.log('Not signed in or no database');
      return;
    }

    const user = window.authSystem.getCurrentUser();
    console.log('Current user:', user.email);

    // Check for any pending requests we sent
    try {
      const pendingRequests = await this.db.collection('gameRequests')
        .where('from.uid', '==', user.uid)
        .where('status', '==', 'pending')
        .get();
      
      console.log('Pending requests we sent:', pendingRequests.docs.length);
      pendingRequests.docs.forEach(doc => {
        console.log('Pending request:', doc.data());
      });

      // Check for any accepted requests we sent
      const acceptedRequests = await this.db.collection('gameRequests')
        .where('from.uid', '==', user.uid)
        .where('status', '==', 'accepted')
        .get();
      
      console.log('Accepted requests we sent:', acceptedRequests.docs.length);
      acceptedRequests.docs.forEach(doc => {
        console.log('Accepted request:', doc.data());
      });

      // Check for any games we should be in
      const ourGames = await this.db.collection('games')
        .where('host.uid', '==', user.uid)
        .get();
      
      console.log('Games where we are host:', ourGames.docs.length);
      ourGames.docs.forEach(doc => {
        console.log('Our game:', doc.data());
      });

    } catch (error) {
      console.error('Test error:', error);
    }
  }

  // Test function to check current game state
  async testGameState() {
    console.log('=== TESTING GAME STATE ===');
    
    if (!this.db || !this.currentGame) {
      console.log('No current game or database');
      return;
    }

    try {
      const gameDoc = await this.db.collection('games').doc(this.currentGame).get();
      
      if (gameDoc.exists) {
        const gameData = gameDoc.data();
        console.log('Current game data:', gameData);
        console.log('Game state:', gameData.state);
        console.log('Host ready:', gameData.host && gameData.host.ready);
        console.log('Guest ready:', gameData.guest && gameData.guest.ready);
        console.log('Is host:', this.isHost);
        console.log('Local game state:', this.gameState);
      } else {
        console.log('Game document does not exist');
      }
    } catch (error) {
      console.error('Test game state error:', error);
    }
  }

  showMultiplayerMenu() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    const menuHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 Simple Multiplayer</h2>
        
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Send Game Request:</h3>
          <div style="margin-bottom: 1rem;">
            <input id="targetUsername" type="text" placeholder="Enter opponent's username" 
                   style="font-size: 1.2rem; padding: 0.5rem; width: 200px; margin-right: 1rem;">
            <button onclick="window.simpleMultiplayerSystem.sendGameRequest(document.getElementById('targetUsername').value, 4)" 
                    style="padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Send 4-Digit Request
            </button>
          </div>
          <div style="margin-bottom: 1rem;">
            <button onclick="window.simpleMultiplayerSystem.sendGameRequest(document.getElementById('targetUsername').value, 3)" 
                    style="padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 0.5rem;">
              3-Digit
            </button>
            <button onclick="window.simpleMultiplayerSystem.sendGameRequest(document.getElementById('targetUsername').value, 5)" 
                    style="padding: 0.5rem 1rem; background: #f39c12; color: white; border: none; border-radius: 5px; cursor: pointer;">
              5-Digit
            </button>
          </div>
        </div>
        
        <div style="font-size: 1rem; color: #ccc; margin-top: 2rem;">
          <div>• Enter the exact username of your opponent</div>
          <div>• They will receive a popup to accept/decline</div>
          <div>• Both players must be signed in</div>
          <div>• First to guess the opponent's number wins!</div>
        </div>
        
        <button onclick="window.simpleMultiplayerSystem.testHostNotification()" 
                style="padding: 0.5rem 1rem; background: #9b59b6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 1rem; font-size: 0.9rem;">
          🔍 Debug Host Notification
        </button>
        
        <button onclick="window.simpleMultiplayerSystem.cleanupOldRequests()" 
                style="padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 0.5rem; font-size: 0.9rem;">
          🧹 Cleanup Old Requests
        </button>
      </div>
    `;

    gameScreen.innerHTML = menuHTML;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.showLobbyScreen();
    });
  }

  showMultiplayerLobby() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    const gameId = this.currentGame;

    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 Multiplayer Game</h2>
        <div style="font-size: 1.5rem; margin-bottom: 1rem;">Game ID: ${gameId}</div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #ccc;">Waiting for opponent to join...</div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem;">
          <div>👤 You: ${window.authSystem.getUserProfile()?.username || 'Player'}</div>
          <div id="opponentStatus" style="color: #ccc;">⏳ Waiting for opponent...</div>
        </div>
        
        <div id="secretNumberSection" style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">🔐 Enter Your Secret Number</h3>
          <div style="font-size: 1.2rem; margin-bottom: 1rem; color: #ccc;">
            Think of a ${this.gameMode}-digit number for your opponent to guess
          </div>
          <input type="number" id="secretNumberInput" placeholder="Enter your secret number" 
                 style="font-size: 2rem; padding: 1rem; width: 300px; text-align: center; border: none; border-radius: 10px; background: #333; color: white; margin-bottom: 1rem;">
          <button id="setSecretBtn" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer;">Set Secret Number</button>
        </div>
        
        <button id="readyBtn" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer; display: none;">I'm Ready!</button>
        
        <button onclick="window.simpleMultiplayerSystem.testGameState()" 
                style="padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 1rem; font-size: 0.9rem;">
          🔍 Test Game State
        </button>
      </div>
    `;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    document.getElementById('setSecretBtn').addEventListener('click', () => {
      this.setSecretNumber();
    });

    document.getElementById('readyBtn').addEventListener('click', () => {
      this.setReady();
      document.getElementById('readyBtn').disabled = true;
      document.getElementById('readyBtn').textContent = 'Ready!';
    });
  }

  async setReady() {
    if (!this.db || !this.currentGame) return;

    const user = window.authSystem.getCurrentUser();
    
    try {
      if (this.isHost) {
        await this.db.collection('games').doc(this.currentGame).update({
          'host.ready': true
        });
      } else {
        await this.db.collection('games').doc(this.currentGame).update({
          'guest.ready': true
        });
      }
      console.log('Set ready successfully for', this.isHost ? 'host' : 'guest');
    } catch (error) {
      console.error('Set ready error:', error);
    }
  }

  listenToGameUpdates() {
    console.log('=== LISTEN TO GAME UPDATES ===');
    console.log('Current game:', this.currentGame);
    console.log('Database available:', !!this.db);
    
    if (!this.db || !this.currentGame) {
      console.log('Cannot listen to updates - missing db or currentGame');
      return;
    }

    console.log('Setting up listener for game:', this.currentGame);
    
    this.db.collection('games').doc(this.currentGame).onSnapshot((doc) => {
      console.log('=== GAME UPDATE RECEIVED ===');
      console.log('Document exists:', doc.exists);
      
      const gameData = doc.data();
      console.log('Game data received:', gameData);
      
      if (!gameData) {
        console.log('Game ended or not found');
        this.leaveGame();
        return;
      }

      this.handleGameUpdate(gameData);
    }, (error) => {
      console.error('Game update listener error:', error);
    });
  }

  handleGameUpdate(gameData) {
    console.log('=== HANDLE GAME UPDATE ===');
    console.log('Game data:', gameData);
    console.log('Current game state:', this.gameState);
    console.log('Is host:', this.isHost);
    
    // Set game state, default to 'waiting' if not specified
    this.gameState = gameData.state || 'waiting';
    console.log('New game state:', this.gameState);
    
    const opponentData = this.isHost ? gameData.guest : gameData.host;
    if (opponentData) {
      this.opponent = {
        username: opponentData.username,
        guesses: opponentData.guesses || [],
        secretNumber: opponentData.secretNumber
      };
      this.opponentGuesses = opponentData.guesses || [];
      console.log('Opponent data:', this.opponent);
    }

    // Update my data from Firestore
    const myData = this.isHost ? gameData.host : gameData.guest;
    if (myData) {
      if (myData.guesses) {
        this.myGuesses = myData.guesses;
      }
      if (myData.secretNumber) {
        this.secretNumber = myData.secretNumber;
      }
    }

    // Store opponent's secret number for guessing
    if (this.isHost && gameData.guest && gameData.guest.secretNumber) {
      this.opponentSecretNumber = gameData.guest.secretNumber;
    } else if (!this.isHost && gameData.host && gameData.host.secretNumber) {
      this.hostSecretNumber = gameData.host.secretNumber;
    }

    // Update opponent status in lobby
    const opponentStatus = document.getElementById('opponentStatus');
    if (opponentStatus && this.opponent) {
      if (this.opponent.secretNumber) {
        opponentStatus.innerHTML = '✅ Opponent has set their secret number';
        opponentStatus.style.color = '#4CAF50';
      } else {
        opponentStatus.innerHTML = '⏳ Opponent is setting their secret number...';
        opponentStatus.style.color = '#ff9800';
      }
    }

    // Check if both players are ready
    const hostReady = gameData.host && gameData.host.ready;
    const guestReady = gameData.guest && gameData.guest.ready;
    
    console.log('Host ready:', hostReady);
    console.log('Guest ready:', guestReady);
    console.log('Game state is waiting:', this.gameState === 'waiting');
    
    if (this.gameState === 'waiting' && hostReady && guestReady) {
      console.log('Both players ready, starting game!');
      this.startGame();
    }

    if (this.gameState === 'playing' && !this.gameStartTime) {
      this.gameStartTime = gameData.gameStartTime;
      console.log('Game started, showing multiplayer game');
      this.showMultiplayerGame();
    }

    if (this.gameState === 'finished') {
      console.log('Game finished, showing results');
      this.showGameResults(gameData);
    }

    // Update displays if game is playing
    if (this.gameState === 'playing') {
      this.updateGuessDisplays();
    }
  }

  async endGame(playerWon) {
    console.log('=== ENDING GAME ===');
    console.log('Player won:', playerWon);
    
    if (!this.db || !this.currentGame) return;

    try {
      await this.db.collection('games').doc(this.currentGame).update({
        state: 'finished',
        winner: playerWon ? window.authSystem.getUserProfile()?.username : this.opponent?.username,
        endedAt: new Date().toISOString()
      });
      
      console.log('Game ended successfully');
    } catch (error) {
      console.error('End game error:', error);
    }
  }

  async startGame() {
    console.log('=== START GAME ===');
    console.log('Current game:', this.currentGame);
    console.log('Database available:', !!this.db);
    
    if (!this.db || !this.currentGame) {
      console.log('Cannot start game - missing db or currentGame');
      return;
    }

    try {
      console.log('Updating game state to playing...');
      await this.db.collection('games').doc(this.currentGame).update({
        state: 'playing',
        gameStartTime: new Date().toISOString()
      });
      console.log('Game state updated to playing successfully');
    } catch (error) {
      console.error('Start game error:', error);
    }
  }

  async leaveGame() {
    console.log('=== LEAVING GAME ===');
    console.log('Current game:', this.currentGame);
    
    if (!this.db || !this.currentGame) {
      console.log('No game to leave');
      this.resetGameState();
      this.showLobbyScreen();
      return;
    }

    try {
      // Delete the game document
      await this.db.collection('games').doc(this.currentGame).delete();
      console.log('Game document deleted');
    } catch (error) {
      console.error('Delete game error:', error);
    }

    // Reset game state
    this.resetGameState();
    
    // Show lobby screen
    this.showLobbyScreen();
    
    console.log('Successfully left game');
  }

  showLobbyScreen() {
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
  }

  // Placeholder functions for game UI (similar to the original multiplayer system)
  showMultiplayerGame() {
    console.log('=== SHOWING MULTIPLAYER GAME ===');
    
    const gameScreen = document.getElementById('gameScreen');
    
    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 20px; right: 20px; background: rgba(255, 215, 0, 0.9); color: #000; padding: 0.5rem 1rem; border-radius: 15px; font-size: 1.5rem; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">⏱️ <span id="timer">${this.timeLimit}</span>s</div>
      
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🎮 Multiplayer Game</h2>
        <div style="font-size: 1.5rem; margin-bottom: 1rem;">
          <div>👤 You: ${window.authSystem.getUserProfile()?.username || 'Player'}</div>
          <div>👥 Opponent: ${this.opponent?.username || 'Unknown'}</div>
        </div>
        
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #ccc;">
          <div>🎯 Guess your opponent's ${this.gameMode}-digit number!</div>
          <div>⏰ Time limit: ${this.timeLimit} seconds</div>
          <div>🏆 Winner: Player with fewer total guesses</div>
        </div>
        
        <div style="margin-bottom: 2rem;">
          <input type="number" id="guessInput" placeholder="Enter your guess" 
                 style="font-size: 2rem; padding: 1rem; width: 300px; text-align: center; border: none; border-radius: 10px; background: #333; color: white;">
          <button id="submitGuess" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer; margin-left: 1rem;">Submit</button>
        </div>
        
        <div id="myGuesses" style="margin-bottom: 2rem; text-align: left; max-width: 600px;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Your Guesses (${this.myGuesses.length}):</h3>
          <div id="myGuessesList"></div>
        </div>
        
        <div id="opponentStatus" style="margin-bottom: 2rem; text-align: left; max-width: 600px;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Opponent Status:</h3>
          <div id="opponentStatusText" style="font-size: 1.2rem; color: #ccc;">⏳ Opponent is guessing...</div>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    const guessInput = document.getElementById('guessInput');
    const submitBtn = document.getElementById('submitGuess');

    submitBtn.addEventListener('click', () => {
      this.submitGuess();
    });

    guessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitGuess();
      }
    });

    // Start timer
    this.startGameTimer();
    
    // Update displays
    this.updateGuessDisplays();
  }

  async submitGuess() {
    const guessInput = document.getElementById('guessInput');
    const guess = guessInput.value.trim();
    
    if (!guess || guess.length !== this.gameMode) {
      alert(`Please enter a ${this.gameMode}-digit number!`);
      return;
    }

    // Check if guess is valid (all digits)
    if (!/^\d+$/.test(guess)) {
      alert('Please enter only digits!');
      return;
    }

    console.log('Submitting guess:', guess);
    
    try {
      // Check if guess is correct
      const isCorrect = this.checkGuess(guess);
      
      // Get feedback for the guess
      const feedback = this.getGuessFeedback(guess);
      
      // Add guess to local array with feedback
      const guessData = {
        guess: guess,
        correct: isCorrect,
        feedback: feedback,
        timestamp: new Date().toISOString()
      };
      
      this.myGuesses.push(guessData);
      
      // Update Firestore
      if (this.isHost) {
        await this.db.collection('games').doc(this.currentGame).update({
          'host.guesses': this.myGuesses
        });
      } else {
        await this.db.collection('games').doc(this.currentGame).update({
          'guest.guesses': this.myGuesses
        });
      }
      
      // Clear input
      guessInput.value = '';
      
      // Update displays
      this.updateGuessDisplays();
      
      console.log('Guess submitted successfully, correct:', isCorrect);
      
      // Check if game should end
      if (isCorrect) {
        this.checkGameEnd();
      }
      
    } catch (error) {
      console.error('Submit guess error:', error);
      alert('Failed to submit guess. Please try again.');
    }
  }

  checkGuess(guess) {
    // Check against opponent's secret number
    const opponentSecret = this.isHost ? this.opponentSecretNumber : this.hostSecretNumber;
    return guess === opponentSecret;
  }

  getGuessFeedback(guess) {
    // Get the opponent's secret number
    const opponentSecret = this.isHost ? this.opponentSecretNumber : this.hostSecretNumber;
    
    if (!opponentSecret) return [];
    
    const feedback = [];
    const secretDigits = opponentSecret.split('');
    const guessDigits = guess.split('');
    
    // First pass: mark correct positions (green)
    const usedSecret = new Array(secretDigits.length).fill(false);
    const usedGuess = new Array(guessDigits.length).fill(false);
    
    // Find exact matches (green)
    for (let i = 0; i < guessDigits.length; i++) {
      if (guessDigits[i] === secretDigits[i]) {
        feedback[i] = 'green';
        usedSecret[i] = true;
        usedGuess[i] = true;
      }
    }
    
    // Second pass: mark wrong positions (yellow)
    for (let i = 0; i < guessDigits.length; i++) {
      if (!usedGuess[i]) {
        for (let j = 0; j < secretDigits.length; j++) {
          if (!usedSecret[j] && guessDigits[i] === secretDigits[j]) {
            feedback[i] = 'yellow';
            usedSecret[j] = true;
            break;
          }
        }
      }
    }
    
    // Third pass: mark not in number (red)
    for (let i = 0; i < guessDigits.length; i++) {
      if (!feedback[i]) {
        feedback[i] = 'red';
      }
    }
    
    return feedback;
  }

  checkGameEnd() {
    // Check if both players have guessed correctly
    const myCorrect = this.myGuesses.some(g => g.correct);
    const opponentCorrect = this.opponentGuesses.some(g => g.correct);
    
    if (myCorrect && opponentCorrect) {
      // Both players have guessed correctly, determine winner
      const myGuesses = this.myGuesses.length;
      const opponentGuesses = this.opponentGuesses.length;
      
      let winner;
      if (myGuesses < opponentGuesses) {
        winner = window.authSystem.getUserProfile()?.username;
      } else if (opponentGuesses < myGuesses) {
        winner = this.opponent?.username;
      } else {
        winner = 'Tie';
      }
      
      this.endGame(winner === window.authSystem.getUserProfile()?.username);
    }
  }

  updateGuessDisplays() {
    // Update my guesses display with color-coded feedback
    const myGuessesList = document.getElementById('myGuessesList');
    if (myGuessesList) {
      myGuessesList.innerHTML = this.myGuesses.map(guessData => {
        const guess = guessData.guess;
        const feedback = guessData.feedback || [];
        
        let feedbackHTML = '';
        for (let i = 0; i < guess.length; i++) {
          const color = feedback[i] || 'red';
          feedbackHTML += `<span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: ${color}; margin: 0 2px;"></span>`;
        }
        
        return `<div style="font-size: 1.2rem; margin: 0.5rem 0; padding: 0.5rem; background: #333; border-radius: 5px;">
          <div style="margin-bottom: 0.5rem;">${guess}</div>
          <div style="margin-bottom: 0.5rem;">${feedbackHTML}</div>
          ${guessData.correct ? '<div style="color: #4CAF50; font-weight: bold;">✅ Correct!</div>' : ''}
        </div>`;
      }).join('');
    }

    // Update opponent status
    const opponentStatusText = document.getElementById('opponentStatusText');
    if (opponentStatusText) {
      if (this.opponentGuesses.length > 0) {
        const lastGuess = this.opponentGuesses[this.opponentGuesses.length - 1];
        if (lastGuess && lastGuess.correct) {
          opponentStatusText.innerHTML = '✅ Opponent has guessed correctly!';
          opponentStatusText.style.color = '#4CAF50';
        } else {
          opponentStatusText.innerHTML = `⏳ Opponent has made ${this.opponentGuesses.length} guess${this.opponentGuesses.length !== 1 ? 'es' : ''}...`;
          opponentStatusText.style.color = '#ff9800';
        }
      } else {
        opponentStatusText.innerHTML = '⏳ Opponent is guessing...';
        opponentStatusText.style.color = '#ccc';
      }
    }
  }

  startGameTimer() {
    let timeLeft = this.timeLimit;
    const timerElement = document.getElementById('timer');
    
    if (timerElement) {
      const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
          clearInterval(timer);
          
          // Play loss sound when time runs out
          if (window.soundSystem) {
            window.soundSystem.playLossSound();
          }
          
          this.endGame(false); // Time's up, player loses
        }
      }, 1000);
    }
  }

  showGameResults(gameData) {
    console.log('=== SHOWING GAME RESULTS ===');
    console.log('Game data:', gameData);
    
    const gameScreen = document.getElementById('gameScreen');
    const winner = gameData.winner;
    const isWinner = winner === window.authSystem.getUserProfile()?.username;
    
    // Play winning sound if player won, loss sound if player lost
    if (window.soundSystem) {
      if (isWinner) {
        window.soundSystem.playWinningSound();
      } else {
        window.soundSystem.playLossSound();
      }
    }
    
    gameScreen.innerHTML = `
      <button id="lobbyBtn" class="top-left">Back to Lobby</button>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
        <h2 style="font-size: 2.5rem; margin-bottom: 2rem;">🏆 Game Over!</h2>
        <div style="font-size: 2rem; margin-bottom: 2rem; color: ${isWinner ? '#4CAF50' : '#ff4136'};">
          ${isWinner ? '🎉 You Won!' : '😔 You Lost!'}
        </div>
        <div style="font-size: 1.5rem; margin-bottom: 2rem;">
          <div>👑 Winner: ${winner || 'Unknown'}</div>
          <div>🎯 Game Mode: ${this.gameMode}-digit</div>
        </div>
        <div style="font-size: 1.2rem; margin-bottom: 2rem; color: #ccc;">
          <div>Your Guesses: ${this.myGuesses.length}</div>
          <div>Opponent's Guesses: ${this.opponentGuesses.length}</div>
        </div>
        <button id="playAgainBtn" style="font-size: 1.5rem; padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer;">Play Again</button>
      </div>
    `;

    document.getElementById('lobbyBtn').addEventListener('click', () => {
      this.leaveGame();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      this.leaveGame();
    });
  }

  async setSecretNumber() {
    const secretInput = document.getElementById('secretNumberInput');
    const secret = secretInput.value.trim();
    
    if (!secret || secret.length !== this.gameMode) {
      alert(`Please enter a ${this.gameMode}-digit number!`);
      return;
    }

    // Check if guess is valid (all digits)
    if (!/^\d+$/.test(secret)) {
      alert('Please enter only digits!');
      return;
    }

    console.log('Setting secret number:', secret);
    
    try {
      // Store secret number locally
      this.secretNumber = secret;
      
      // Update Firestore with both secret number and ready status
      if (this.isHost) {
        await this.db.collection('games').doc(this.currentGame).update({
          'host.secretNumber': secret,
          'host.ready': true
        });
      } else {
        await this.db.collection('games').doc(this.currentGame).update({
          'guest.secretNumber': secret,
          'guest.ready': true
        });
      }
      
      // Hide secret input and show ready status
      document.getElementById('secretNumberSection').style.display = 'none';
      document.getElementById('readyBtn').style.display = 'block';
      document.getElementById('readyBtn').textContent = 'Secret Number Set!';
      document.getElementById('readyBtn').disabled = true;
      
      console.log('Secret number set successfully and marked as ready');
      
    } catch (error) {
      console.error('Set secret number error:', error);
      alert('Failed to set secret number. Please try again.');
    }
  }
}

// Initialize simple multiplayer system
let simpleMultiplayerSystem;
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    simpleMultiplayerSystem = new SimpleMultiplayerSystem();
    window.simpleMultiplayerSystem = simpleMultiplayerSystem;
  }, 1000);
}); 