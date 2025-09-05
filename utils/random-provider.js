/**
 * @fileoverview Random provider interface for dependency injection to make random-dependent functions pure
 * @module utils/random-provider
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * Default random provider that uses Math.random().
 * This is used when no custom random provider is injected.
 * 
 * @class SystemRandomProvider
 */
class SystemRandomProvider {
  /**
   * Generates a random number between 0 (inclusive) and 1 (exclusive).
   * 
   * @returns {number} Random number from Math.random()
   */
  random() {
    return Math.random();
  }

  /**
   * Generates a random number between min and max (both inclusive).
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number between min and max
   */
  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Generates a random integer between min and max (both inclusive).
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer between min and max
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Seeded random provider for deterministic testing.
 * Uses a Linear Congruential Generator (LCG) algorithm.
 * 
 * @class SeededRandomProvider
 */
class SeededRandomProvider {
  /**
   * Creates a new seeded random provider.
   * 
   * @param {number} [seed=12345] - Seed value for random generation
   */
  constructor(seed = 12345) {
    this.seed = seed;
    this._state = seed;
  }

  /**
   * Generates a random number between 0 (inclusive) and 1 (exclusive).
   * Uses Linear Congruential Generator algorithm for deterministic results.
   * 
   * @returns {number} Pseudo-random number between 0 and 1
   */
  random() {
    // LCG parameters (same as used by glibc)
    const a = 1103515245;
    const c = 12345;
    const m = Math.pow(2, 31);

    this._state = (a * this._state + c) % m;
    return this._state / m;
  }

  /**
   * Generates a random number between min and max (both inclusive).
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number between min and max
   */
  randomRange(min, max) {
    return this.random() * (max - min) + min;
  }

  /**
   * Generates a random integer between min and max (both inclusive).
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer between min and max
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Resets the random generator to its initial seed state.
   */
  reset() {
    this._state = this.seed;
  }

  /**
   * Sets a new seed and resets the generator state.
   * 
   * @param {number} newSeed - New seed value
   */
  setSeed(newSeed) {
    this.seed = newSeed;
    this._state = newSeed;
  }

  /**
   * Gets the current seed value.
   * 
   * @returns {number} Current seed value
   */
  getSeed() {
    return this.seed;
  }
}

/**
 * Mock random provider that returns controlled values for testing.
 * 
 * @class MockRandomProvider
 */
class MockRandomProvider {
  constructor() {
    this._values = [];
    this._index = 0;
  }

  /**
   * Sets a sequence of values to return from random().
   * 
   * @param {number[]} values - Array of values to return in sequence
   */
  setValues(values) {
    this._values = [...values];
    this._index = 0;
  }

  /**
   * Adds more values to the end of the sequence.
   * 
   * @param {number[]} values - Array of values to add
   */
  addValues(values) {
    this._values.push(...values);
  }

  /**
   * Returns the next value in the sequence.
   * Cycles back to the beginning if all values have been used.
   * 
   * @returns {number} Next value in the sequence
   */
  random() {
    if (this._values.length === 0) {
      return 0.5; // Default fallback
    }

    const value = this._values[this._index];
    this._index = (this._index + 1) % this._values.length;
    return value;
  }

  /**
   * Generates a random number between min and max using the sequence.
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number between min and max
   */
  randomRange(min, max) {
    return this.random() * (max - min) + min;
  }

  /**
   * Generates a random integer between min and max using the sequence.
   * 
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer between min and max
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Resets the sequence index to the beginning.
   */
  reset() {
    this._index = 0;
  }

  /**
   * Gets the current index in the sequence (for testing).
   * 
   * @returns {number} Current index
   */
  getCurrentIndex() {
    return this._index;
  }

  /**
   * Gets the number of values in the sequence (for testing).
   * 
   * @returns {number} Number of values
   */
  getValueCount() {
    return this._values.length;
  }
}

module.exports = {
  SystemRandomProvider,
  SeededRandomProvider,
  MockRandomProvider,
  // Factory function to avoid singleton pattern risks
  default: () => new SystemRandomProvider()
};