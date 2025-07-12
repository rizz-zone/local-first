import { vi, beforeEach, describe, expect, it } from 'vitest'
import { sharedWorkerEntrypoint } from './shared_worker'
import { WorkerDoubleInitError } from '../../../../common/errors'
import { portManager } from '../../helpers/port_manager'
import { importUnique } from '../../../../testing/dynamic_import'

describe('SharedWorker entrypoint', () => {
  const initSpy = vi.spyOn(portManager, 'init')
  beforeEach(() => {
    initSpy.mockClear()
  })

  it('does not call portManager.init if not invoked', async () => {
    await importUnique('./shared_worker')
    expect(initSpy).not.toBeCalled()
  })

  it('calls portManager.init when invoked', () => {
    sharedWorkerEntrypoint()
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('can only be called once', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    // First call should not throw
    expect(() => sharedWorkerEntrypoint()).not.toThrow()
    // Second call should throw
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
  })

  it('maintains initialization state across multiple test runs', async () => {
    // Test that the initialization state persists within the same import
    const { sharedWorkerEntrypoint: entrypoint1 } = await importUnique('./shared_worker')
    entrypoint1()
    expect(initSpy).toHaveBeenCalledOnce()

    // Second call should throw
    expect(() => entrypoint1()).toThrow(WorkerDoubleInitError)
    expect(initSpy).toHaveBeenCalledOnce() // Should not call init again
  })

  it('throws WorkerDoubleInitError with correct message on double initialization', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    sharedWorkerEntrypoint()

    expect(() => {
      sharedWorkerEntrypoint()
    }).toThrow(WorkerDoubleInitError)

    // Verify the error is specifically WorkerDoubleInitError
    try {
      sharedWorkerEntrypoint()
    } catch (error) {
      expect(error).toBeInstanceOf(WorkerDoubleInitError)
    }
  })

  it('handles portManager.init errors gracefully', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    const mockError = new Error('Port manager initialization failed')
    initSpy.mockImplementationOnce(() => {
      throw mockError
    })

    expect(() => {
      sharedWorkerEntrypoint()
    }).toThrow(mockError)

    // Verify that even after an error, subsequent calls still throw WorkerDoubleInitError
    expect(() => {
      sharedWorkerEntrypoint()
    }).toThrow(WorkerDoubleInitError)
  })

  it('verifies portManager.init is called with no arguments', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    sharedWorkerEntrypoint()

    expect(initSpy).toHaveBeenCalledWith()
    expect(initSpy).toHaveBeenCalledTimes(1)
  })

  it('handles rapid successive calls correctly', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')

    // First call should succeed
    expect(() => sharedWorkerEntrypoint()).not.toThrow()

    // Multiple rapid successive calls should all throw
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)

    // Init should only be called once
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('returns undefined on successful initialization', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    const result = sharedWorkerEntrypoint()

    expect(result).toBeUndefined()
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('maintains separate state for different imports', async () => {
    // Import and initialize first instance
    const { sharedWorkerEntrypoint: entrypoint1 } = await importUnique('./shared_worker')
    entrypoint1()
    expect(initSpy).toHaveBeenCalledTimes(1)

    // Import second instance - should be able to initialize independently
    const { sharedWorkerEntrypoint: entrypoint2 } = await importUnique('./shared_worker')
    entrypoint2()
    expect(initSpy).toHaveBeenCalledTimes(2)

    // But second call on each instance should throw
    expect(() => entrypoint1()).toThrow(WorkerDoubleInitError)
    expect(() => entrypoint2()).toThrow(WorkerDoubleInitError)
  })
})

describe('SharedWorker entrypoint edge cases', () => {
  const initSpy = vi.spyOn(portManager, 'init')

  beforeEach(() => {
    initSpy.mockClear()
  })

  it('handles portManager.init returning a value', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    const mockReturnValue = { success: true }
    initSpy.mockReturnValueOnce(mockReturnValue)

    const result = sharedWorkerEntrypoint()

    expect(result).toBeUndefined() // Should not return portManager.init result
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('handles portManager.init with async behavior', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    let resolvePromise: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    initSpy.mockImplementationOnce(() => {
      // Simulate async initialization
      setTimeout(() => resolvePromise(), 10)
      return promise
    })

    // Should not throw even if portManager.init is async
    expect(() => sharedWorkerEntrypoint()).not.toThrow()
    expect(initSpy).toHaveBeenCalledOnce()

    // Second call should still throw immediately
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
  })

  it('verifies function identity and behavior', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')

    expect(typeof sharedWorkerEntrypoint).toBe('function')
    expect(sharedWorkerEntrypoint.length).toBe(0) // Should accept no parameters
    expect(sharedWorkerEntrypoint.name).toBe('sharedWorkerEntrypoint')
  })

  it('handles multiple error types from portManager.init', async () => {
    const testCases = [
      new TypeError('Type error in port manager'),
      new ReferenceError('Reference error in port manager'),
      new Error('Generic error in port manager'),
      'String error',
      null,
      undefined
    ]

    for (const errorCase of testCases) {
      const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
      initSpy.mockImplementationOnce(() => {
        throw errorCase
      })

      expect(() => {
        sharedWorkerEntrypoint()
      }).toThrow()

      // Subsequent calls should throw WorkerDoubleInitError regardless of initial error
      expect(() => {
        sharedWorkerEntrypoint()
      }).toThrow(WorkerDoubleInitError)
    }
  })

  it('validates TypeScript generic behavior', async () => {
    // Test that the function can be called with TypeScript generics
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')

    // Should work with explicit generic (compile-time test)
    expect(() => {
      sharedWorkerEntrypoint()
    }).not.toThrow()

    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('preserves call stack in error scenarios', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    sharedWorkerEntrypoint() // First call succeeds

    try {
      sharedWorkerEntrypoint() // Second call should throw
    } catch (error) {
      expect(error).toBeInstanceOf(WorkerDoubleInitError)
      expect(error.stack).toContain('sharedWorkerEntrypoint')
    }
  })

  it('handles synchronous exceptions during first call', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
    const synchronousError = new Error('Synchronous init error')

    initSpy.mockImplementationOnce(() => {
      throw synchronousError
    })

    // First call throws the init error
    expect(() => sharedWorkerEntrypoint()).toThrow(synchronousError)

    // Flag should still be set, so subsequent calls throw WorkerDoubleInitError
    expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)

    // Init should only be attempted once
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('maintains consistent behavior across many calls', async () => {
    const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')

    // First call succeeds
    sharedWorkerEntrypoint()
    expect(initSpy).toHaveBeenCalledOnce()

    // All subsequent calls should throw WorkerDoubleInitError
    for (let i = 0; i < 10; i++) {
      expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
    }

    // Init should still only be called once
    expect(initSpy).toHaveBeenCalledOnce()
  })
})