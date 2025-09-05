/**
 * @fileoverview Time provider interface for dependency injection to make time-dependent functions pure
 * @module utils/time-provider
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * Default time provider that uses system time functions.
 * This is used when no custom time provider is injected.
 * 
 * @class SystemTimeProvider
 */
class SystemTimeProvider {
  /**
   * Gets the current timestamp in milliseconds.
   * 
   * @returns {number} Current timestamp from Date.now()
   */
  now() {
    return Date.now();
  }

  /**
   * Creates a timeout that calls a function after the specified delay.
   * 
   * @param {Function} callback - Function to call after delay
   * @param {number} delayMs - Delay in milliseconds
   * @returns {*} Timer identifier that can be used with clearTimeout
   */
  setTimeout(callback, delayMs) {
    return setTimeout(callback, delayMs);
  }

  /**
   * Cancels a timeout created by setTimeout.
   * 
   * @param {*} timerId - Timer identifier returned by setTimeout
   */
  clearTimeout(timerId) {
    clearTimeout(timerId);
  }

  /**
   * Creates a promise that resolves after the specified delay.
   * 
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise<void>} Promise that resolves after the delay
   */
  delay(delayMs) {
    return new Promise(resolve => this.setTimeout(resolve, delayMs));
  }
}

/**
 * Mock time provider for testing purposes.
 * Allows controlling time progression and timeout execution.
 * 
 * @class MockTimeProvider
 */
class MockTimeProvider {
  constructor() {
    this._currentTime = 0;
    this._nextTimerId = 1;
    this._timers = new Map();
  }

  /**
   * Gets the current mocked timestamp.
   * 
   * @returns {number} Current mocked timestamp
   */
  now() {
    return this._currentTime;
  }

  /**
   * Sets the current mocked timestamp.
   * 
   * @param {number} timestamp - New timestamp to set
   */
  setTime(timestamp) {
    this._currentTime = timestamp;
  }

  /**
   * Advances the mocked time by the specified amount.
   * 
   * @param {number} deltaMs - Milliseconds to advance
   */
  advanceTime(deltaMs) {
    this._currentTime += deltaMs;
    this._triggerTimers();
  }

  /**
   * Creates a mocked timeout.
   * 
   * @param {Function} callback - Function to call
   * @param {number} delayMs - Delay in milliseconds
   * @returns {number} Timer identifier
   */
  setTimeout(callback, delayMs) {
    const timerId = this._nextTimerId++;
    const triggerTime = this._currentTime + delayMs;
    
    this._timers.set(timerId, {
      callback,
      triggerTime,
      active: true
    });
    
    return timerId;
  }

  /**
   * Cancels a mocked timeout.
   * 
   * @param {number} timerId - Timer identifier
   */
  clearTimeout(timerId) {
    const timer = this._timers.get(timerId);
    if (timer) {
      timer.active = false;
    }
  }

  /**
   * Creates a promise that resolves after the specified delay.
   * 
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise<void>} Promise that resolves after advancing time
   */
  delay(delayMs) {
    return new Promise(resolve => {
      this.setTimeout(resolve, delayMs);
    });
  }

  /**
   * Triggers all active timers whose time has come.
   * 
   * @private
   */
  _triggerTimers() {
    for (const [timerId, timer] of this._timers.entries()) {
      if (timer.active && timer.triggerTime <= this._currentTime) {
        timer.active = false;
        timer.callback();
        this._timers.delete(timerId);
      }
    }
  }

  /**
   * Gets the number of active timers (for testing).
   * 
   * @returns {number} Number of active timers
   */
  getActiveTimerCount() {
    return Array.from(this._timers.values()).filter(timer => timer.active).length;
  }

  /**
   * Clears all timers (for testing cleanup).
   */
  clearAllTimers() {
    this._timers.clear();
  }
}

module.exports = {
  SystemTimeProvider,
  MockTimeProvider,
  // Default export for convenience
  default: new SystemTimeProvider()
};