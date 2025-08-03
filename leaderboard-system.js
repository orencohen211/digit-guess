// Leaderboard System
class LeaderboardSystem {
  constructor() {
    this.db = window.FirebaseApp ? window.FirebaseApp.db : null;
    this.leaderboardData = [];
    this.currentUserRank = null;
  }

  async updateUserScore(userId, username, coins) {
    if (!this.db) return;

    try {
      // Update leaderboard collection
      await this.db.collection('leaderboard').doc(userId).set({
        username: username,
        coins: coins,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      // Also update the users collection with username for consistency
      await this.db.collection('users').doc(userId).set({
        username: username,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      console.log('Leaderboard score updated for:', username);
    } catch (error) {
      console.error('Update leaderboard error:', error);
    }
  }

  async loadLeaderboard() {
    if (!this.db) return [];

    try {
      // First, get all users from the users collection to ensure all accounts appear
      const allUsersSnapshot = await this.db.collection('users').get();
      const allUsers = [];
      
      allUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.stats && userData.stats.coins !== undefined) {
          allUsers.push({
            id: doc.id,
            username: userData.username || 'Unknown Player',
            coins: userData.stats.coins,
            lastUpdated: userData.lastUpdated || new Date().toISOString()
          });
        }
      });

      // Also get any additional entries from the leaderboard collection
      const leaderboardSnapshot = await this.db.collection('leaderboard').get();
      const leaderboardEntries = new Map();
      
      leaderboardSnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboardEntries.set(doc.id, {
          id: doc.id,
          username: data.username,
          coins: data.coins,
          lastUpdated: data.lastUpdated
        });
      });

      // Merge the data, preferring leaderboard entries for usernames
      const mergedUsers = new Map();
      
      // Add all users from users collection
      allUsers.forEach(user => {
        mergedUsers.set(user.id, user);
      });
      
      // Update with leaderboard entries (which might have better username data)
      leaderboardEntries.forEach((entry, id) => {
        if (mergedUsers.has(id)) {
          // Update existing entry with leaderboard data
          const existing = mergedUsers.get(id);
          mergedUsers.set(id, {
            ...existing,
            username: entry.username || existing.username,
            lastUpdated: entry.lastUpdated || existing.lastUpdated
          });
        } else {
          // Add new entry from leaderboard
          mergedUsers.set(id, entry);
        }
      });

      // Convert to array and sort by coins
      this.leaderboardData = Array.from(mergedUsers.values())
        .sort((a, b) => b.coins - a.coins)
        .slice(0, 50); // Top 50

      // Find current user's rank
      if (window.authSystem && window.authSystem.isSignedIn()) {
        const currentUser = window.authSystem.getCurrentUser();
        const userProfile = window.authSystem.getUserProfile();
        const currentCoins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;
        
        this.currentUserRank = this.leaderboardData.findIndex(entry => 
          entry.id === currentUser.uid
        ) + 1; // +1 because findIndex is 0-based

        // If user not in top 50, calculate their rank from all users
        if (this.currentUserRank === 0) {
          const allUsersWithMoreCoins = Array.from(mergedUsers.values())
            .filter(user => user.coins > currentCoins);
          this.currentUserRank = allUsersWithMoreCoins.length + 1;
        }
      }

      console.log('Leaderboard loaded:', this.leaderboardData.length, 'entries from', mergedUsers.size, 'total users');
      return this.leaderboardData;
    } catch (error) {
      console.error('Load leaderboard error:', error);
      return [];
    }
  }

  async showLeaderboard() {
    const leaderboardData = await this.loadLeaderboard();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.9); z-index: 2000; display: flex; 
      justify-content: center; align-items: center; overflow-y: auto;
    `;

    let leaderboardHTML = `
      <div style="background: #1a1a1a; border-radius: 20px; padding: 3rem; 
                  max-width: 600px; max-height: 80vh; overflow-y: auto; 
                  box-shadow: 0 0 50px rgba(0,0,0,0.8);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2 style="color: #fff; margin: 0; font-size: 2.5rem;">🏆 Coin Leaderboard</h2>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  style="background: #ff4136; color: white; border: none; padding: 0.5rem 1rem; 
                         border-radius: 5px; cursor: pointer; font-size: 1.2rem;">✕</button>
        </div>
    `;

    if (this.currentUserRank) {
      const currentUser = window.authSystem.getCurrentUser();
      const userProfile = window.authSystem.getUserProfile();
      const currentCoins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;
      
      leaderboardHTML += `
        <div style="background: rgba(255, 215, 0, 0.2); border: 2px solid #ffd700; 
                    border-radius: 10px; padding: 1rem; margin-bottom: 2rem; color: #fff;">
          <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">Your Ranking</div>
          <div style="font-size: 2rem; font-weight: bold; color: #ffd700;">#${this.currentUserRank}</div>
          <div style="font-size: 1rem; opacity: 0.8;">${userProfile ? userProfile.username : 'You'}: ${currentCoins} coins</div>
        </div>
      `;
    }

    leaderboardHTML += `
        <div style="margin-bottom: 1rem;">
          <div style="display: grid; grid-template-columns: 50px 1fr 100px; gap: 1rem; 
                      padding: 0.5rem; background: #333; border-radius: 5px; font-weight: bold; color: #fff;">
            <div>Rank</div>
            <div>Player</div>
            <div>Coins</div>
          </div>
        </div>
    `;

    leaderboardData.forEach((entry, index) => {
      const rank = index + 1;
      const isCurrentUser = window.authSystem && window.authSystem.isSignedIn() && 
                           entry.id === window.authSystem.getCurrentUser().uid;
      
      const rowStyle = isCurrentUser ? 
        'background: rgba(255, 215, 0, 0.2); border: 1px solid #ffd700;' : 
        'background: rgba(255,255,255,0.05);';
      
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      
      leaderboardHTML += `
        <div style="display: grid; grid-template-columns: 50px 1fr 100px; gap: 1rem; 
                    padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 5px; 
                    ${rowStyle} color: #fff;">
          <div style="font-weight: bold;">${rankIcon}</div>
          <div>${entry.username}</div>
          <div style="color: #ffd700; font-weight: bold;">${entry.coins}</div>
        </div>
      `;
    });

    if (leaderboardData.length === 0) {
      leaderboardHTML += `
        <div style="text-align: center; color: #ccc; padding: 2rem;">
          No players yet. Be the first to earn coins!
        </div>
      `;
    }

    leaderboardHTML += `
      </div>
    `;

    modal.innerHTML = leaderboardHTML;
    document.body.appendChild(modal);
  }

  async refreshUserScore() {
    if (!window.authSystem || !window.authSystem.isSignedIn()) return;

    const user = window.authSystem.getCurrentUser();
    const userProfile = window.authSystem.getUserProfile();
    const coins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;

    if (user && userProfile) {
      await this.updateUserScore(user.uid, userProfile.username, coins);
    }
  }
}

// Initialize leaderboard system
let leaderboardSystem;
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    leaderboardSystem = new LeaderboardSystem();
    window.leaderboardSystem = leaderboardSystem;
  }, 1000); // Wait for Firebase to initialize
}); 