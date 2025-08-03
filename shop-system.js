// Shop System
const SHOP_ITEMS = {
  hints: {
    name: "Hint Token",
    description: "Get a hint during gameplay",
    price: 50,
    icon: "💡",
    type: "consumable",
    effect: "hint"
  },
  timeBonus: {
    name: "Time Bonus",
    description: "Extra time in time attack mode",
    price: 30,
    icon: "⏰",
    type: "consumable",
    effect: "timeBonus"
  },
  streakProtection: {
    name: "Streak Protection",
    description: "Protect your streak from one loss",
    price: 100,
    icon: "🛡️",
    type: "consumable",
    effect: "streakProtection"
  },
  coinMultiplier: {
    name: "Coin Multiplier",
    description: "2x coins for 5 games",
    price: 200,
    icon: "💰",
    type: "consumable",
    effect: "coinMultiplier"
  },
  customTheme: {
    name: "Dark Theme",
    description: "Unlock dark theme",
    price: 150,
    icon: "🌙",
    type: "permanent",
    effect: "theme"
  },
  soundPack: {
    name: "Premium Sounds",
    description: "Unlock premium sound effects",
    price: 100,
    icon: "🎵",
    type: "permanent",
    effect: "soundPack"
  },
  profileBadge: {
    name: "VIP Badge",
    description: "Show off your status",
    price: 500,
    icon: "👑",
    type: "permanent",
    effect: "badge"
  }
};

let playerInventory = {
  hints: 0,
  timeBonus: 0,
  streakProtection: 0,
  coinMultiplier: 0,
  activeMultiplier: 0,
  unlockedThemes: ['default'],
  unlockedSoundPacks: ['default'],
  unlockedBadges: []
};

let shopOpen = false;

function loadShopData() {
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    const saved = localStorage.getItem('numberGuessingShop');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        playerInventory = { ...playerInventory, ...parsed };
      } catch (e) {
        console.error('Error loading shop data:', e);
      }
    }
  }
}

async function loadUserShopData() {
  // Always load from localStorage first as backup
  loadShopData();
  
  // If user is signed in, try to load from Firebase and merge
  if (window.authSystem && window.authSystem.isSignedIn()) {
    try {
      const user = window.authSystem.getCurrentUser();
      if (!user) return;

      const db = window.FirebaseApp.db;
      const doc = await db.collection('users').doc(user.uid).get();

      if (doc.exists) {
        const userData = doc.data();
        if (userData.shop) {
          // Merge Firebase data with localStorage data (Firebase takes precedence)
          playerInventory = { ...playerInventory, ...userData.shop };
          console.log('Shop data loaded from Firebase and merged with localStorage');
        }
      }
    } catch (error) {
      console.error('Load shop data from Firebase error:', error);
      // If Firebase fails, we still have localStorage data
    }
  }
}

function saveShopData() {
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    localStorage.setItem('numberGuessingShop', JSON.stringify(playerInventory));
  }
}

async function saveUserShopData() {
  // Always save to localStorage as backup
  saveShopData();
  
  // If user is signed in, also save to Firebase
  if (window.authSystem && window.authSystem.isSignedIn()) {
    try {
      const user = window.authSystem.getCurrentUser();
      if (!user) return;

      const db = window.FirebaseApp.db;
      await db.collection('users').doc(user.uid).update({
        shop: playerInventory
      });
      console.log('Shop data saved to Firebase');
    } catch (error) {
      console.error('Save shop data to Firebase error:', error);
      // If Firebase fails, at least we have localStorage backup
    }
  }
}

function buyItem(itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return false;

  // Check if permanent item is already owned
  if (item.type === 'permanent') {
    if (itemId === 'customTheme' && playerInventory.unlockedThemes.includes('dark')) {
      showShopMessage('You already own this theme!', 'error');
      return false;
    } else if (itemId === 'soundPack' && playerInventory.unlockedSoundPacks.includes('premium')) {
      showShopMessage('You already own this sound pack!', 'error');
      return false;
    } else if (itemId === 'profileBadge' && playerInventory.unlockedBadges.includes('vip')) {
      showShopMessage('You already own this badge!', 'error');
      return false;
    }
  }

  const currentCoins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;
  
  if (currentCoins < item.price) {
    showShopMessage('Not enough coins!', 'error');
    return false;
  }

  // Deduct coins
  window.StatsSystem.addCoins(-item.price);

  // Add item to inventory
  if (item.type === 'consumable') {
    playerInventory[itemId]++;
  } else if (item.type === 'permanent') {
    if (itemId === 'customTheme') {
      playerInventory.unlockedThemes.push('dark');
    } else if (itemId === 'soundPack') {
      playerInventory.unlockedSoundPacks.push('premium');
    } else if (itemId === 'profileBadge') {
      playerInventory.unlockedBadges.push('vip');
    }
  }

  saveUserShopData();
  showShopMessage(`Purchased ${item.name}!`, 'success');
  updateShopUI();
  return true;
}

function useItem(itemId) {
  if (playerInventory[itemId] <= 0) {
    showShopMessage('No items available!', 'error');
    return false;
  }

  // Special check for hints - only allow during gameplay
  if (itemId === 'hints') {
    if (!window.hintSystem || !window.hintSystem.canUseHint()) {
      showShopMessage('Hints can only be used during gameplay!', 'error');
      return false;
    }
  }

  playerInventory[itemId]--;
  saveUserShopData();
  updateShopUI();
  
  // Apply item effect
  applyItemEffect(itemId);
  return true;
}

function applyItemEffect(itemId) {
  switch (itemId) {
    case 'hints':
      // Hint system is handled directly in the game
      showShopMessage('Hint token used! Use the hint button in the game.', 'success');
      break;
    case 'timeBonus':
      // Time bonus would be applied in time attack mode
      showShopMessage('Time bonus activated!', 'success');
      break;
    case 'streakProtection':
      // Streak protection would be applied in achievement system
      showShopMessage('Streak protected!', 'success');
      break;
    case 'coinMultiplier':
      playerInventory.activeMultiplier = 5;
      showShopMessage('2x coins for 5 games!', 'success');
      break;
  }
}

function showShopMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${type === 'error' ? '#ff4136' : type === 'success' ? '#2ecc40' : '#007cbe'};
    color: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    font-size: 1.2rem;
    z-index: 5000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  `;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    document.body.removeChild(messageDiv);
  }, 2000);
}

function showShop() {
  if (shopOpen) return;
  shopOpen = true;

  const shopOverlay = document.createElement('div');
  shopOverlay.id = 'shopOverlay';
  shopOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;

  const shopContent = document.createElement('div');
  shopContent.style.cssText = `
    background: #1a1a1a;
    padding: 2rem;
    border-radius: 20px;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
    position: relative;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: #ff4136;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    cursor: pointer;
  `;
  closeBtn.onclick = hideShop;

  const title = document.createElement('h2');
  title.textContent = '🛒 Shop';
  title.style.cssText = 'text-align: center; margin-bottom: 2rem; color: #ffd700;';

  const currentCoins = window.StatsSystem ? window.StatsSystem.getCoins() : 0;
  const coinsDisplay = document.createElement('div');
  coinsDisplay.innerHTML = `🪙 ${currentCoins} coins`;
  coinsDisplay.style.cssText = 'text-align: center; font-size: 1.5rem; margin-bottom: 2rem; color: #ffd700;';

  const itemsGrid = document.createElement('div');
  itemsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;';

  Object.entries(SHOP_ITEMS).forEach(([itemId, item]) => {
    const itemCard = createShopItemCard(itemId, item);
    itemsGrid.appendChild(itemCard);
  });

  const inventorySection = createInventorySection();

  shopContent.appendChild(closeBtn);
  shopContent.appendChild(title);
  shopContent.appendChild(coinsDisplay);
  shopContent.appendChild(itemsGrid);
  shopContent.appendChild(inventorySection);
  shopOverlay.appendChild(shopContent);
  document.body.appendChild(shopOverlay);
}

function createShopItemCard(itemId, item) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: #333;
    padding: 1.5rem;
    border-radius: 15px;
    text-align: center;
    border: 2px solid #555;
  `;

  const icon = document.createElement('div');
  icon.textContent = item.icon;
  icon.style.cssText = 'font-size: 3rem; margin-bottom: 1rem;';

  const name = document.createElement('h3');
  name.textContent = item.name;
  name.style.cssText = 'margin-bottom: 0.5rem; color: #ffd700;';

  const description = document.createElement('p');
  description.textContent = item.description;
  description.style.cssText = 'margin-bottom: 1rem; opacity: 0.8; font-size: 0.9rem;';

  const price = document.createElement('div');
  price.innerHTML = `🪙 ${item.price}`;
  price.style.cssText = 'font-size: 1.2rem; color: #ffd700; margin-bottom: 1rem;';

  // Check if permanent item is already owned
  let isOwned = false;
  let ownedText = '';
  
  if (item.type === 'permanent') {
    if (itemId === 'customTheme' && playerInventory.unlockedThemes.includes('dark')) {
      isOwned = true;
      ownedText = 'Owned';
    } else if (itemId === 'soundPack' && playerInventory.unlockedSoundPacks.includes('premium')) {
      isOwned = true;
      ownedText = 'Owned';
    } else if (itemId === 'profileBadge' && playerInventory.unlockedBadges.includes('vip')) {
      isOwned = true;
      ownedText = 'Owned';
    }
  }

  const buyBtn = document.createElement('button');
  buyBtn.textContent = isOwned ? ownedText : 'Buy';
  buyBtn.style.cssText = `
    background: ${isOwned ? '#666' : '#4CAF50'};
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    cursor: ${isOwned ? 'not-allowed' : 'pointer'};
    font-size: 1rem;
  `;
  
  if (!isOwned) {
    buyBtn.onclick = () => buyItem(itemId);
  }

  card.appendChild(icon);
  card.appendChild(name);
  card.appendChild(description);
  card.appendChild(price);
  card.appendChild(buyBtn);

  return card;
}

function createInventorySection() {
  const section = document.createElement('div');
  section.style.cssText = 'margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #555;';

  const title = document.createElement('h3');
  title.textContent = '📦 Inventory';
  title.style.cssText = 'text-align: center; margin-bottom: 1rem; color: #ffd700;';

  const inventoryGrid = document.createElement('div');
  inventoryGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;';

  // Consumable items
  Object.entries(SHOP_ITEMS).forEach(([itemId, item]) => {
    if (item.type === 'consumable' && playerInventory[itemId] > 0) {
      const inventoryItem = document.createElement('div');
      inventoryItem.style.cssText = `
        background: #444;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
        border: 2px solid #666;
      `;

      const icon = document.createElement('div');
      icon.textContent = item.icon;
      icon.style.cssText = 'font-size: 2rem; margin-bottom: 0.5rem;';

      const name = document.createElement('div');
      name.textContent = item.name;
      name.style.cssText = 'margin-bottom: 0.5rem; color: #ffd700;';

      const count = document.createElement('div');
      count.textContent = `x${playerInventory[itemId]}`;
      count.style.cssText = 'font-size: 1.2rem; margin-bottom: 1rem;';

      // Check if hint can be used (only during gameplay)
      const canUseHint = itemId === 'hints' ? window.hintSystem && window.hintSystem.canUseHint() : true;
      
      const useBtn = document.createElement('button');
      useBtn.textContent = itemId === 'hints' ? (canUseHint ? 'Use' : 'Use in Game') : 'Use';
      useBtn.style.cssText = `
        background: ${canUseHint ? '#007cbe' : '#666'};
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: ${canUseHint ? 'pointer' : 'not-allowed'};
      `;
      
      if (canUseHint) {
        useBtn.onclick = () => useItem(itemId);
      }

      inventoryItem.appendChild(icon);
      inventoryItem.appendChild(name);
      inventoryItem.appendChild(count);
      inventoryItem.appendChild(useBtn);
      inventoryGrid.appendChild(inventoryItem);
    }
  });

  // Permanent items (owned)
  const permanentItems = [];
  if (playerInventory.unlockedThemes.includes('dark')) {
    permanentItems.push({ id: 'customTheme', name: 'Dark Theme', icon: '🌙' });
  }
  if (playerInventory.unlockedSoundPacks.includes('premium')) {
    permanentItems.push({ id: 'soundPack', name: 'Premium Sounds', icon: '🎵' });
  }
  if (playerInventory.unlockedBadges.includes('vip')) {
    permanentItems.push({ id: 'profileBadge', name: 'VIP Badge', icon: '👑' });
  }

  if (permanentItems.length > 0) {
    const permanentTitle = document.createElement('h4');
    permanentTitle.textContent = '🎁 Owned Items';
    permanentTitle.style.cssText = 'text-align: center; margin: 2rem 0 1rem 0; color: #2ecc40; font-size: 1.2rem;';
    section.appendChild(permanentTitle);

    const permanentGrid = document.createElement('div');
    permanentGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;';

    permanentItems.forEach(item => {
      const permanentItem = document.createElement('div');
      permanentItem.style.cssText = `
        background: #2d5a2d;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
        border: 2px solid #4CAF50;
      `;

      const icon = document.createElement('div');
      icon.textContent = item.icon;
      icon.style.cssText = 'font-size: 2rem; margin-bottom: 0.5rem;';

      const name = document.createElement('div');
      name.textContent = item.name;
      name.style.cssText = 'margin-bottom: 0.5rem; color: #2ecc40;';

      const status = document.createElement('div');
      status.textContent = '✓ Owned';
      status.style.cssText = 'font-size: 1rem; color: #2ecc40; font-weight: bold;';

      permanentItem.appendChild(icon);
      permanentItem.appendChild(name);
      permanentItem.appendChild(status);
      permanentGrid.appendChild(permanentItem);
    });

    section.appendChild(permanentGrid);
  }

  section.appendChild(title);
  section.appendChild(inventoryGrid);
  return section;
}

function hideShop() {
  const overlay = document.getElementById('shopOverlay');
  if (overlay) {
    document.body.removeChild(overlay);
    shopOpen = false;
  }
}

function updateShopUI() {
  // This would be called when shop data changes
  if (shopOpen) {
    hideShop();
    showShop();
  }
}

// Initialize shop system
function initializeShopSystem() {
  // Load shop data immediately for guest users
  if (!window.authSystem || !window.authSystem.isSignedIn()) {
    loadShopData();
  }
  // For signed-in users, data will be loaded by the auth system
}

// Export functions
window.ShopSystem = {
  showShop,
  hideShop,
  buyItem,
  useItem,
  getInventory: () => playerInventory,
  loadUserShopData,
  saveUserShopData,
  initializeShopSystem
};

// Initialize when the script loads
initializeShopSystem();

// Save shop data when page is about to unload
window.addEventListener('beforeunload', () => {
  if (window.ShopSystem) {
    window.ShopSystem.saveUserShopData();
  }
});

// Save shop data periodically (every 30 seconds)
setInterval(() => {
  if (window.ShopSystem) {
    window.ShopSystem.saveUserShopData();
  }
}, 30000); 