// Hint System
class HintSystem {
  constructor() {
    this.currentTarget = null;
    this.currentGuesses = [];
    this.hintUsed = false;
  }

  setGameState(target, guesses = []) {
    this.currentTarget = target;
    this.currentGuesses = guesses;
    this.hintUsed = false;
  }

  canUseHint() {
    if (this.hintUsed) return false;
    if (!window.ShopSystem) return false;
    
    // Only allow hints during active gameplay (not in lobby)
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen || gameScreen.classList.contains('hidden')) {
      return false;
    }
    
    const inventory = window.ShopSystem.getInventory();
    return inventory.hints > 0;
  }

  useHint() {
    if (!this.canUseHint()) {
      return null;
    }

    // Use a hint token
    window.ShopSystem.useItem('hints');
    this.hintUsed = true;

    return this.generateHint();
  }

  generateHint() {
    if (!this.currentTarget) return "No target number set";

    const target = this.currentTarget.toString();
    const targetDigits = target.split('').map(Number);
    
    if (this.currentGuesses.length === 0) {
      // First hint - give a general direction
      return this.getFirstHint(targetDigits);
    } else {
      // Subsequent hints - analyze previous guesses
      return this.getAdvancedHint(targetDigits);
    }
  }

  getFirstHint(targetDigits) {
    const sum = targetDigits.reduce((a, b) => a + b, 0);
    const product = targetDigits.reduce((a, b) => a * b, 1);
    
    const hints = [
      `The sum of all digits is ${sum}`,
      `The product of all digits is ${product}`,
      `The largest digit is ${Math.max(...targetDigits)}`,
      `The smallest digit is ${Math.min(...targetDigits)}`,
      `There are ${targetDigits.filter(d => d % 2 === 0).length} even digits`,
      `There are ${targetDigits.filter(d => d % 2 === 1).length} odd digits`
    ];
    
    return hints[Math.floor(Math.random() * hints.length)];
  }

  getAdvancedHint(targetDigits) {
    if (this.currentGuesses.length === 0) return this.getFirstHint(targetDigits);

    const lastGuess = this.currentGuesses[this.currentGuesses.length - 1];
    const lastGuessDigits = lastGuess.toString().split('').map(Number);
    
    // Analyze the last guess vs target
    const correctPositions = this.countCorrectPositions(lastGuessDigits, targetDigits);
    const correctDigits = this.countCorrectDigits(lastGuessDigits, targetDigits);
    
    if (correctPositions === 0 && correctDigits === 0) {
      // No correct digits at all
      return "None of the digits in your last guess are in the target number";
    } else if (correctPositions === targetDigits.length) {
      return "You're very close! All digits are correct and in the right position";
    } else if (correctDigits === targetDigits.length) {
      return "All digits are correct, but some are in the wrong position";
    } else {
      // Give specific feedback
      const hints = [
        `You have ${correctDigits} correct digits (${correctPositions} in correct position)`,
        `Try focusing on the digits that are correct but in wrong positions`,
        `The target has ${targetDigits.length} digits, you found ${correctDigits} correct ones`
      ];
      return hints[Math.floor(Math.random() * hints.length)];
    }
  }

  countCorrectPositions(guessDigits, targetDigits) {
    let count = 0;
    for (let i = 0; i < Math.min(guessDigits.length, targetDigits.length); i++) {
      if (guessDigits[i] === targetDigits[i]) count++;
    }
    return count;
  }

  countCorrectDigits(guessDigits, targetDigits) {
    const targetCount = {};
    const guessCount = {};
    
    // Count digits in target
    targetDigits.forEach(d => {
      targetCount[d] = (targetCount[d] || 0) + 1;
    });
    
    // Count digits in guess
    guessDigits.forEach(d => {
      guessCount[d] = (guessCount[d] || 0) + 1;
    });
    
    let total = 0;
    for (const digit in targetCount) {
      total += Math.min(targetCount[digit], guessCount[digit] || 0);
    }
    
    return total;
  }

  reset() {
    this.currentTarget = null;
    this.currentGuesses = [];
    this.hintUsed = false;
  }
}

// Create global hint system instance
window.hintSystem = new HintSystem(); 