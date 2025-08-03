// Authentication System
class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.auth = null;
    this.db = null;
    this.userProfile = null;
    this.initializeFirebase();
  }

  initializeFirebase() {
    // Wait for Firebase to be available
    if (window.FirebaseApp && window.FirebaseApp.auth) {
      this.auth = window.FirebaseApp.auth;
      this.db = window.FirebaseApp.db;
      this.setupAuthListener();
    } else {
      // Retry after a short delay
      setTimeout(() => this.initializeFirebase(), 100);
    }
  }

  setupAuthListener() {
    if (!this.auth) return;
    
    this.auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? user.email : 'signed out');
      
      this.currentUser = user;
      if (user) {
        console.log('User signed in:', user.email);
        await this.loadUserProfile(); // Load user profile
        await this.loadUserData(); // Load general user data (achievements)
        // Load user stats from Firebase
        if (window.StatsSystem) {
          console.log('Loading stats for signed in user');
          await window.StatsSystem.loadUserStats();
        }
        // Load user achievements from Firebase
        if (window.AchievementsSystem) {
          console.log('Loading achievements for signed in user');
          await window.AchievementsSystem.loadUserAchievements();
        }
        // Load user shop data from Firebase
        if (window.ShopSystem) {
          console.log('Loading shop data for signed in user');
          await window.ShopSystem.loadUserShopData();
        }
        this.updateUIForSignedInUser();
        // Refresh the game UI to show updated stats
        if (window.refreshGameUI) {
          window.refreshGameUI();
        }
        
        // Update leaderboard with current user's score
        if (window.leaderboardSystem && this.userProfile) {
          const coins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;
          await window.leaderboardSystem.updateUserScore(user.uid, this.userProfile.username, coins);
        }
      } else {
        console.log('User signed out');
        this.userProfile = null; // Clear profile on sign out
        // Save current stats to localStorage before signing out
        if (window.StatsSystem) {
          console.log('Saving stats to localStorage before sign out');
          window.StatsSystem.saveStats();
        }
        // Save current achievements to localStorage before signing out
        if (window.AchievementsSystem) {
          console.log('Saving achievements to localStorage before sign out');
          window.AchievementsSystem.saveAchievements();
        }
        // Save current shop data to localStorage before signing out
        if (window.ShopSystem) {
          console.log('Saving shop data to localStorage before sign out');
          window.ShopSystem.saveUserShopData();
        }
        this.updateUIForSignedOutUser();
      }
    });
  }

  async loadUserProfile() {
    if (!this.currentUser || !this.db) return;

    try {
      const doc = await this.db.collection('userProfiles').doc(this.currentUser.uid).get();
      if (doc.exists) {
        this.userProfile = doc.data();
        console.log('User profile loaded:', this.userProfile);
      } else {
        // Create default profile for new users
        this.userProfile = {
          username: this.currentUser.email.split('@')[0], // Default to email prefix
          email: this.currentUser.email,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        await this.saveUserProfile();
      }
    } catch (error) {
      console.error('Load user profile error:', error);
    }
  }

  async saveUserProfile() {
    if (!this.currentUser || !this.db || !this.userProfile) return;

    try {
      this.userProfile.lastUpdated = new Date().toISOString();
      await this.db.collection('userProfiles').doc(this.currentUser.uid).set(this.userProfile);
      console.log('User profile saved successfully');
    } catch (error) {
      console.error('Save user profile error:', error);
    }
  }

  async updateUsername(newUsername) {
    if (!this.currentUser || !this.db) return;

    try {
      // Check if username is already taken
      const usernameQuery = await this.db.collection('userProfiles')
        .where('username', '==', newUsername)
        .where('email', '!=', this.currentUser.email)
        .get();

      if (!usernameQuery.empty) {
        throw new Error('Username already taken');
      }

      // Update username
      this.userProfile.username = newUsername;
      await this.saveUserProfile();
      this.updateUIForSignedInUser();
      return true;
    } catch (error) {
      console.error('Update username error:', error);
      throw error;
    }
  }

  async signUp(email, password) {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      console.log('User signed up successfully');
      return userCredential.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      console.log('User signed in successfully');
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      await this.auth.signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async saveUserData() {
    if (!this.currentUser || !this.db) return;

    try {
      const userData = {
        stats: window.StatsSystem ? window.StatsSystem.getAllStats() : null, // Get all stats from StatsSystem
        achievements: window.AchievementsSystem ? window.AchievementsSystem.getUnlockedAchievements() : null,
        lastPlayed: new Date().toISOString()
      };

      await this.db.collection('users').doc(this.currentUser.uid).set(userData, { merge: true });
      console.log('User data saved successfully');
    } catch (error) {
      console.error('Save user data error:', error);
    }
  }

  async loadUserData() {
    if (!this.currentUser || !this.db) return;

    try {
      const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
      if (doc.exists) {
        const userData = doc.data();
        console.log('User data loaded successfully');
        
        // Load stats if available
        if (userData.stats && window.StatsSystem) {
          // You can implement loading logic here
          console.log('Stats loaded:', userData.stats);
        }
        
        // Load achievements if available
        if (userData.achievements && window.AchievementsSystem) {
          // You can implement loading logic here
          console.log('Achievements loaded:', userData.achievements);
        }
      }
    } catch (error) {
      console.error('Load user data error:', error);
    }
  }

  updateUIForSignedInUser() {
    const loginScreen = document.getElementById('loginScreen');
    const userInfo = document.getElementById('userInfo');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (userInfo) {
      userInfo.classList.remove('hidden');
      const displayName = this.userProfile ? this.userProfile.username : this.currentUser.email.split('@')[0];
      userInfo.innerHTML = `
        <div style="color: #fff; font-size: 1rem; background: rgba(0,0,0,0.8); padding: 0.5rem 1rem; border-radius: 10px;">
          <div style="margin-bottom: 0.3rem;">👤 ${displayName}</div>
          <div style="font-size: 0.8rem; opacity: 0.8;">${this.currentUser.email}</div>
          <div style="margin-top: 0.5rem;">
            <button onclick="showUsernameModal()" style="margin-right: 0.5rem; padding: 0.2rem 0.5rem; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Change Username</button>
            <button onclick="authSystem.signOut()" style="padding: 0.2rem 0.5rem; background: #ff4136; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Sign Out</button>
          </div>
        </div>
      `;
    }
  }

  updateUIForSignedOutUser() {
    const loginScreen = document.getElementById('loginScreen');
    const userInfo = document.getElementById('userInfo');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (userInfo) userInfo.classList.add('hidden');
  }

  isSignedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserProfile() {
    return this.userProfile;
  }
}

// Initialize auth system
let authSystem;
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for Firebase to initialize
  setTimeout(() => {
    authSystem = new AuthSystem();
    window.authSystem = authSystem;
  }, 500);
}); 