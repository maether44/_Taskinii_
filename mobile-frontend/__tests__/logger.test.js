// Test the logger module directly (not through the mock)
// We need to clear the mock first to test the real module

beforeEach(() => {
  jest.resetModules();
});

describe('logger', () => {
  it('exports log, warn, error functions', () => {
    jest.unmock('../lib/logger');
    const logger = require('../lib/logger');
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('functions are callable without throwing', () => {
    jest.unmock('../lib/logger');
    const logger = require('../lib/logger');
    expect(() => logger.log('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
  });
});
