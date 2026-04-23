/**
 * Converts a given number of seconds to milliseconds.
 *
 * @param {number} n - The number of seconds.
 * @returns {number} The equivalent value in milliseconds.
 */
export const seconds = (n: number) => n * 1000

/**
 * Converts a given number of minutes to milliseconds.
 *
 * @param {number} n - The number of minutes.
 * @returns {number} The equivalent value in milliseconds.
 */
export const minutes = (n: number) => n * 60 * 1000

/**
 * Converts a given number of hours to milliseconds.
 *
 * @param {number} n - The number of hours.
 * @returns {number} The equivalent value in milliseconds.
 */
export const hours = (n: number) => n * 60 * 60 * 1000

/**
 * Converts a given number of days to milliseconds.
 *
 * @param {number} n - The number of days.
 * @returns {number} The equivalent value in milliseconds.
 */
export const days = (n: number) => n * 24 * 60 * 60 * 1000
