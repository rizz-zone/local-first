import { describe, it, expect } from 'vitest';
import {
  TEST_ONLY,
  DOUBLE_SHAREDWORKER_PORT_INIT,
  workerDoubleInit
} from './messages';

describe('Error Messages Module', () => {
  describe('TEST_ONLY constant', () => {
    it('should be a string containing testing error message', () => {
      expect(typeof TEST_ONLY).toBe('string');
      expect(TEST_ONLY.length).toBeGreaterThan(0);
    });

    it('should contain reference to Vitest', () => {
      expect(TEST_ONLY).toContain('Vitest');
    });

    it('should contain reference to internal process', () => {
      expect(TEST_ONLY).toContain('internally');
      expect(TEST_ONLY).toContain('ground0');
    });

    it('should contain report URL', () => {
      expect(TEST_ONLY).toContain('https://ground0.rizz.zone/report/');
      expect(TEST_ONLY).toContain('test_only_fn_used');
    });

    it('should be a complete, well-formed error message', () => {
      expect(TEST_ONLY).toMatch(/^Testing function run outside of Vitest\./);
      expect(TEST_ONLY).not.toContain('undefined');
      expect(TEST_ONLY).not.toContain('null');
    });
  });

  describe('DOUBLE_SHAREDWORKER_PORT_INIT constant', () => {
    it('should be a string containing SharedWorker port initialization error', () => {
      expect(typeof DOUBLE_SHAREDWORKER_PORT_INIT).toBe('string');
      expect(DOUBLE_SHAREDWORKER_PORT_INIT.length).toBeGreaterThan(0);
    });

    it('should contain reference to SharedWorker port', () => {
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('SharedWorker port');
    });

    it('should contain initialization error message', () => {
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('initialized twice');
    });

    it('should contain reference to internal process', () => {
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('internally');
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('ground0');
    });

    it('should contain report URL with correct slug', () => {
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('https://ground0.rizz.zone/report/');
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toContain('sw_double_init');
    });

    it('should be a complete, well-formed error message', () => {
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toMatch(/^SharedWorker port was initialized twice!/);
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).not.toContain('undefined');
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).not.toContain('null');
    });
  });

  describe('workerDoubleInit function', () => {
    describe('when shared is true', () => {
      it('should return message for SharedWorker', () => {
        const result = workerDoubleInit(true);
        expect(typeof result).toBe('string');
        expect(result).toContain('SharedWorker entrypoint called twice');
      });

      it('should contain SharedWorker-specific resolution instructions', () => {
        const result = workerDoubleInit(true);
        expect(result).toContain('sharedWorkerEntrypoint()');
        expect(result).not.toContain('workerEntrypoint()');
      });

      it('should provide clear resolution steps', () => {
        const result = workerDoubleInit(true);
        expect(result).toContain('To resolve this:');
        expect(result).toContain('- Only call');
        expect(result).toContain('- Do not run any other code');
      });

      it('should be properly formatted with line breaks', () => {
        const result = workerDoubleInit(true);
        const lines = result.split('\n');
        expect(lines.length).toBeGreaterThan(2);
        expect(lines[0]).toContain('SharedWorker entrypoint called twice');
      });
    });

    describe('when shared is false', () => {
      it('should return message for regular Worker', () => {
        const result = workerDoubleInit(false);
        expect(typeof result).toBe('string');
        expect(result).toContain('Worker entrypoint called twice');
        expect(result).not.toContain('SharedWorker');
      });

      it('should contain Worker-specific resolution instructions', () => {
        const result = workerDoubleInit(false);
        expect(result).toContain('workerEntrypoint()');
        expect(result).not.toContain('sharedWorkerEntrypoint()');
      });

      it('should provide clear resolution steps', () => {
        const result = workerDoubleInit(false);
        expect(result).toContain('To resolve this:');
        expect(result).toContain('- Only call');
        expect(result).toContain('- Do not run any other code');
      });

      it('should be properly formatted with line breaks', () => {
        const result = workerDoubleInit(false);
        const lines = result.split('\n');
        expect(lines.length).toBeGreaterThan(2);
        expect(lines[0]).toContain('Worker entrypoint called twice');
      });
    });

    describe('edge cases', () => {
      it('should handle truthy values', () => {
        expect(() => workerDoubleInit(1 as unknown as boolean)).not.toThrow();
        expect(() => workerDoubleInit('true' as unknown as boolean)).not.toThrow();
        expect(() => workerDoubleInit({} as unknown as boolean)).not.toThrow();
      });

      it('should handle falsy values', () => {
        expect(() => workerDoubleInit(0 as unknown as boolean)).not.toThrow();
        expect(() => workerDoubleInit('' as unknown as boolean)).not.toThrow();
        expect(() => workerDoubleInit(null as unknown as boolean)).not.toThrow();
        expect(() => workerDoubleInit(undefined as unknown as boolean)).not.toThrow();
      });

      it('should return consistent message structure for all boolean values', () => {
        const trueResult = workerDoubleInit(true);
        const falseResult = workerDoubleInit(false);

        expect(trueResult).toContain('To resolve this:');
        expect(falseResult).toContain('To resolve this:');
        expect(trueResult).toContain('entrypoint called twice');
        expect(falseResult).toContain('entrypoint called twice');
      });
    });

    describe('message content validation', () => {
      it('should provide actionable instructions for SharedWorker', () => {
        const result = workerDoubleInit(true);
        expect(result).toMatch(/Only call.*sharedWorkerEntrypoint\(\).*once/);
        expect(result).toContain('throughout the lifecycle');
      });

      it('should provide actionable instructions for regular Worker', () => {
        const result = workerDoubleInit(false);
        expect(result).toMatch(/Only call.*workerEntrypoint\(\).*once/);
        expect(result).toContain('throughout the lifecycle');
      });

      it('should warn against running other code', () => {
        const sharedResult = workerDoubleInit(true);
        const regularResult = workerDoubleInit(false);

        expect(sharedResult).toContain('Do not run any other code inside of your worker');
        expect(regularResult).toContain('Do not run any other code inside of your worker');
      });
    });
  });

  describe('Message consistency and quality', () => {
    it('should have consistent error message patterns', () => {
      const messages = [TEST_ONLY, DOUBLE_SHAREDWORKER_PORT_INIT];

      messages.forEach(message => {
        expect(message).toContain('ground0');
        expect(message).toContain('https://ground0.rizz.zone/report/');
        expect(message).toContain('internally');
      });
    });

    it('should have proper capitalization and punctuation', () => {
      expect(TEST_ONLY).toMatch(/^[A-Z]/);
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toMatch(/^[A-Z]/);

      const sharedWorkerMsg = workerDoubleInit(true);
      const regularWorkerMsg = workerDoubleInit(false);
      expect(sharedWorkerMsg).toMatch(/^[A-Z]/);
      expect(regularWorkerMsg).toMatch(/^[A-Z]/);
    });

    it('should not contain obvious typos or grammar issues', () => {
      const allMessages = [
        TEST_ONLY,
        DOUBLE_SHAREDWORKER_PORT_INIT,
        workerDoubleInit(true),
        workerDoubleInit(false)
      ];

      allMessages.forEach(message => {
        expect(message).not.toContain('  ');
        expect(message).not.toMatch(/\s+$/m);
        expect(message).not.toContain('teh');
        expect(message).not.toContain('hte');
      });
    });
  });

  describe('URL validation', () => {
    it('should contain valid report URLs', () => {
      const urlRegex = /https:\/\/ground0\.rizz\.zone\/report\/[a-z_]+/g;

      expect(TEST_ONLY).toMatch(urlRegex);
      expect(DOUBLE_SHAREDWORKER_PORT_INIT).toMatch(urlRegex);
    });

    it('should have distinct report identifiers', () => {
      const testOnlyMatch = TEST_ONLY.match(/report\/([a-z_]+)/);
      const doubleInitMatch = DOUBLE_SHAREDWORKER_PORT_INIT.match(/report\/([a-z_]+)/);

      if (!testOnlyMatch || !doubleInitMatch) {
        throw new Error('Report identifier match failed');
      }
      const testOnlyId = testOnlyMatch[1];
      const doubleInitId = doubleInitMatch[1];

      expect(testOnlyId).not.toBe(doubleInitId);
      expect(testOnlyId).toBe('test_only_fn_used');
      expect(doubleInitId).toBe('sw_double_init');
    });
  });

  describe('Integration scenarios', () => {
    it('should work in error handling contexts', () => {
      const errors = {
        testingOutsideVitest: TEST_ONLY,
        sharedWorkerDoubleInit: DOUBLE_SHAREDWORKER_PORT_INIT,
        workerDoubleInit: (shared: boolean) => workerDoubleInit(shared)
      };

      expect(errors.testingOutsideVitest).toBeDefined();
      expect(errors.sharedWorkerDoubleInit).toBeDefined();
      expect(errors.workerDoubleInit(true)).toBeDefined();
      expect(errors.workerDoubleInit(false)).toBeDefined();
    });

    it('should provide helpful debugging information', () => {
      const messages = [
        TEST_ONLY,
        DOUBLE_SHAREDWORKER_PORT_INIT,
        workerDoubleInit(true),
        workerDoubleInit(false)
      ];

      messages.forEach(message => {
        expect(message.length).toBeGreaterThan(50);
        expect(message).toMatch(/[A-Z]/);
      });
    });
  });

  describe('Performance considerations', () => {
    it('should generate worker messages efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        workerDoubleInit(i % 2 === 0);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    it('should have reasonable message lengths', () => {
      const messages = [
        TEST_ONLY,
        DOUBLE_SHAREDWORKER_PORT_INIT,
        workerDoubleInit(true),
        workerDoubleInit(false)
      ];

      messages.forEach(message => {
        expect(message.length).toBeLessThan(1000);
        expect(message.length).toBeGreaterThan(20);
      });
    });
  });
});