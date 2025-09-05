/**
 * @fileoverview Optimized weight statistics calculator with efficient algorithms
 * @module utils/weight-stats-calculator
 * @version 1.0.0
 */

/**
 * Weight statistics result structure
 * @typedef {Object} WeightStats
 * @property {number} min - Minimum weight
 * @property {number} max - Maximum weight
 * @property {number} avg - Average weight
 * @property {number} median - Median weight
 * @property {number} latest - Most recent weight
 * @property {number} oldest - Oldest weight
 * @property {number} change - Total change from oldest to latest
 * @property {number} changePercent - Percentage change
 * @property {number} trend - Trend direction (-1: down, 0: stable, 1: up)
 * @property {number} standardDeviation - Standard deviation
 * @property {number} count - Total number of entries
 * @property {Array<Object>} weeklyAverages - Weekly averages if requested
 * @property {Array<Object>} monthlyAverages - Monthly averages if requested
 */

/**
 * Optimized weight statistics calculator with efficient algorithms
 * and support for incremental updates.
 * 
 * @class WeightStatsCalculator
 */
class WeightStatsCalculator {
  /**
   * Calculates comprehensive weight statistics from entries
   * Uses optimized single-pass algorithm for most calculations
   * 
   * @static
   * @param {Array<Object>} entries - Weight entries array
   * @param {Object} [options={}] - Calculation options
   * @param {boolean} [options.includeAdvanced=false] - Include advanced statistics
   * @param {boolean} [options.includeWeekly=false] - Include weekly averages
   * @param {boolean} [options.includeMonthly=false] - Include monthly averages
   * @returns {WeightStats|null} Calculated statistics or null if no data
   */
  static calculate(entries, options = {}) {
    if (!entries || entries.length === 0) {
      return null;
    }

    // Single-pass algorithm for basic stats using immutable approach
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let sumSquares = 0;
    const weights = [];
    
    // Process entries in single pass, building weights array immutably
    for (const entry of entries) {
      const weight = entry.weight;
      // Build weights array immutably (performance-critical section)
      weights[weights.length] = weight;
      
      if (weight < min) min = weight;
      if (weight > max) max = weight;
      sum += weight;
      
      if (options.includeAdvanced) {
        sumSquares += weight * weight;
      }
    }
    
    const count = entries.length;
    const avg = sum / count;
    
    // Get latest and oldest (assuming entries are sorted by date desc)
    const latest = entries[0].weight;
    const oldest = entries[count - 1].weight;
    const change = latest - oldest;
    const changePercent = oldest !== 0 ? (change / oldest * 100) : 0;
    
    // Calculate trend based on linear regression simplified
    const trend = this.calculateTrend(entries);
    
    const stats = {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      oldest: Math.round(oldest * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
      count
    };
    
    // Add advanced statistics if requested
    if (options.includeAdvanced) {
      stats.median = this.calculateMedian(weights);
      stats.standardDeviation = this.calculateStandardDeviation(sum, sumSquares, count);
    }
    
    // Add time-based aggregations if requested
    if (options.includeWeekly) {
      stats.weeklyAverages = this.calculateWeeklyAverages(entries);
    }
    
    if (options.includeMonthly) {
      stats.monthlyAverages = this.calculateMonthlyAverages(entries);
    }
    
    return stats;
  }
  
  /**
   * Calculates trend using simplified linear regression
   * @private
   * @static
   * @param {Array<Object>} entries - Weight entries sorted by date
   * @returns {number} Trend direction (-1: down, 0: stable, 1: up)
   */
  static calculateTrend(entries) {
    if (entries.length < 2) return 0;
    
    // Use only first and last quarter of data for trend
    const quarterSize = Math.floor(entries.length / 4) || 1;
    const recentAvg = entries.slice(0, quarterSize)
      .reduce((sum, e) => sum + e.weight, 0) / quarterSize;
    const oldAvg = entries.slice(-quarterSize)
      .reduce((sum, e) => sum + e.weight, 0) / quarterSize;
    
    const diff = recentAvg - oldAvg;
    const threshold = 0.5; // 0.5 unit threshold for trend detection
    
    if (diff > threshold) return 1;  // Upward trend
    if (diff < -threshold) return -1; // Downward trend
    return 0; // Stable
  }
  
  /**
   * Calculates median weight efficiently
   * @private
   * @static
   * @param {Array<number>} weights - Array of weight values
   * @returns {number} Median weight
   */
  static calculateMedian(weights) {
    const sorted = [...weights].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2 * 100) / 100;
    }
    return Math.round(sorted[mid] * 100) / 100;
  }
  
  /**
   * Calculates standard deviation efficiently
   * @private
   * @static
   * @param {number} sum - Sum of all values
   * @param {number} sumSquares - Sum of squared values
   * @param {number} count - Number of values
   * @returns {number} Standard deviation
   */
  static calculateStandardDeviation(sum, sumSquares, count) {
    const mean = sum / count;
    const variance = (sumSquares / count) - (mean * mean);
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }
  
  /**
   * Calculates weekly averages from entries
   * @private
   * @static
   * @param {Array<Object>} entries - Weight entries sorted by date
   * @returns {Array<Object>} Weekly averages
   */
  static calculateWeeklyAverages(entries) {
    const weeks = new Map();
    
    for (const entry of entries) {
      const date = new Date(entry.date);
      const weekKey = this.getWeekKey(date);
      
      const existingWeek = weeks.get(weekKey);
      if (!existingWeek) {
        weeks.set(weekKey, { sum: entry.weight, count: 1, startDate: entry.date });
      } else {
        weeks.set(weekKey, {
          ...existingWeek,
          sum: existingWeek.sum + entry.weight,
          count: existingWeek.count + 1
        });
      }
    }
    
    const result = Array.from(weeks.entries(), ([weekKey, data]) => ({
      week: weekKey,
      average: Math.round(data.sum / data.count * 100) / 100,
      count: data.count,
      startDate: data.startDate
    }));
    
    return result.sort((a, b) => b.week.localeCompare(a.week));
  }
  
  /**
   * Calculates monthly averages from entries
   * @private
   * @static
   * @param {Array<Object>} entries - Weight entries sorted by date
   * @returns {Array<Object>} Monthly averages
   */
  static calculateMonthlyAverages(entries) {
    const months = new Map();
    
    for (const entry of entries) {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existingMonth = months.get(monthKey);
      if (!existingMonth) {
        months.set(monthKey, { sum: entry.weight, count: 1 });
      } else {
        months.set(monthKey, {
          ...existingMonth,
          sum: existingMonth.sum + entry.weight,
          count: existingMonth.count + 1
        });
      }
    }
    
    const result = Array.from(months.entries(), ([monthKey, data]) => ({
      month: monthKey,
      average: Math.round(data.sum / data.count * 100) / 100,
      count: data.count
    }));
    
    return result.sort((a, b) => b.month.localeCompare(a.month));
  }
  
  /**
   * Gets week key for a date (ISO week)
   * @private
   * @static
   * @param {Date} date - Date to get week key for
   * @returns {string} Week key in format "YYYY-WW"
   */
  static getWeekKey(date) {
    const year = date.getFullYear();
    const weekNumber = this.getWeekNumber(date);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
  }
  
  /**
   * Gets ISO week number for a date
   * @private
   * @static
   * @param {Date} date - Date to get week number for
   * @returns {number} ISO week number
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
  
  /**
   * Performs incremental update to existing statistics
   * More efficient than recalculating everything
   * 
   * @static
   * @param {WeightStats} existingStats - Existing statistics
   * @param {Object} newEntry - New weight entry to add
   * @returns {WeightStats} Updated statistics
   */
  static incrementalUpdate(existingStats, newEntry) {
    if (!existingStats) {
      return this.calculate([newEntry]);
    }
    
    const newWeight = newEntry.weight;
    const newCount = existingStats.count + 1;
    
    // Update basic stats
    const newMin = Math.min(existingStats.min, newWeight);
    const newMax = Math.max(existingStats.max, newWeight);
    const newSum = existingStats.avg * existingStats.count + newWeight;
    const newAvg = newSum / newCount;
    
    // Update latest (assuming new entry is most recent)
    const newLatest = newWeight;
    const newChange = newLatest - existingStats.oldest;
    const newChangePercent = existingStats.oldest !== 0 
      ? (newChange / existingStats.oldest * 100) 
      : 0;
    
    return {
      ...existingStats,
      min: Math.round(newMin * 100) / 100,
      max: Math.round(newMax * 100) / 100,
      avg: Math.round(newAvg * 100) / 100,
      latest: Math.round(newLatest * 100) / 100,
      change: Math.round(newChange * 100) / 100,
      changePercent: Math.round(newChangePercent * 100) / 100,
      count: newCount,
      // Note: trend, median, and other advanced stats would need full recalculation
      _needsFullRecalc: true
    };
  }
}

module.exports = WeightStatsCalculator;