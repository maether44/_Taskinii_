/**
 * lib/logger.js — Development-only logging.
 *
 * In __DEV__ (Expo dev builds) these behave like console.*
 * In production builds they are silent no-ops, avoiding JS bridge
 * overhead and preventing internal details from leaking.
 */
const noop = () => {};

export const log = __DEV__ ? console.log.bind(console) : noop;
export const warn = __DEV__ ? console.warn.bind(console) : noop;
export const error = __DEV__ ? console.error.bind(console) : noop;
