/**
 * @fileoverview String utility functions for consistent string formatting.
 * @module utils/string-utils
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * Formats a string template by replacing placeholders with corresponding values from a data object.
 * Placeholders are identified by `{key}`.
 *
 * @param {string} template - The string template with placeholders (e.g., "Hello, {name}!").
 * @param {Object} data - An object containing key-value pairs for placeholder replacement.
 * @returns {string} The formatted string.
 *
 * @example
 * const message = formatString("User {username} has role {role}.", { username: "john.doe", role: "admin" });
 * // Returns: "User john.doe has role admin."
 */
function formatString(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data.hasOwnProperty(key) ? data[key] : match;
  });
}

module.exports = {
  formatString,
};
