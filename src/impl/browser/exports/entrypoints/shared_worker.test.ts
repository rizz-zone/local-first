import { vi, beforeEach, describe, expect, it, afterEach } from 'vitest'
import { WorkerDoubleInitError } from '../../../../common/errors'
import { portManager } from '../../helpers/port_manager'
import { importUnique } from '../../../../testing/dynamic_import'

describe('SharedWorker entrypoint', () => {
	const initSpy = vi.spyOn(portManager, 'init')
	
	beforeEach(() => {
		initSpy.mockClear()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
		it('does not call portManager.init if not invoked', async () => {
			await importUnique('./shared_worker')
			expect(initSpy).not.toBeCalled()
		})

		it('calls portManager.init when invoked', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('calls portManager.init with no arguments', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledWith()
		})

		it('returns undefined (void function)', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const result = sharedWorkerEntrypoint()
			expect(result).toBeUndefined()
		})
	})

	describe('double initialization protection', () => {
		it('can only be called once', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			expect(() => sharedWorkerEntrypoint()).not.toThrow()
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it('throws WorkerDoubleInitError on second call', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it('maintains initialization state across multiple attempts', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it('calls portManager.init exactly once even with multiple attempts', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const localInitSpy = vi.spyOn(portManager, 'init')
			
			sharedWorkerEntrypoint()
			
			try { sharedWorkerEntrypoint() } catch { /* ignore */ }
			try { sharedWorkerEntrypoint() } catch { /* ignore */ }
			try { sharedWorkerEntrypoint() } catch { /* ignore */ }

			expect(localInitSpy).toHaveBeenCalledOnce()
		})
	})

	describe('error handling and resilience', () => {
		it('propagates errors from portManager.init', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const mockError = new Error('Port manager initialization failed')
			const localInitSpy = vi.spyOn(portManager, 'init')
			localInitSpy.mockImplementation(() => {
				throw mockError
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(mockError)
		})

		it('marks as initialized even if portManager.init throws', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const mockError = new Error('Initialization failed')
			const localInitSpy = vi.spyOn(portManager, 'init')
			localInitSpy.mockImplementation(() => {
				throw mockError
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(mockError)
			
			// Should throw WorkerDoubleInitError on second call, not the original error
			localInitSpy.mockImplementation(() => {})
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it('handles rapid successive calls without race conditions', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			const results: unknown[] = []
			const errors: unknown[] = []
			
			// Simulate rapid calls that might happen in concurrent scenarios
			for (let i = 0; i < 10; i++) {
				try {
					results.push(sharedWorkerEntrypoint())
				} catch (error) {
					errors.push(error)
				}
			}
			
			expect(results).toHaveLength(1) // Only first call succeeds
			expect(errors).toHaveLength(9) // Rest throw errors
			expect(errors.every(error => error instanceof WorkerDoubleInitError)).toBe(true)
		})
	})

	describe('module isolation and import behavior', () => {
		it('maintains separate initialization state per unique import', async () => {
			// First import instance
			const { sharedWorkerEntrypoint: entrypoint1 } = await importUnique('./shared_worker')
			entrypoint1()
			expect(() => entrypoint1()).toThrow(WorkerDoubleInitError)

			// Second import instance should have fresh state
			const { sharedWorkerEntrypoint: entrypoint2 } = await importUnique('./shared_worker')
			expect(() => entrypoint2()).not.toThrow()
			expect(() => entrypoint2()).toThrow(WorkerDoubleInitError)
		})

		it('preserves initialization state across function references', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const entrypointRef = sharedWorkerEntrypoint
			
			entrypointRef()
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => entrypointRef()).toThrow(WorkerDoubleInitError)
		})

		it('works correctly when destructured', async () => {
			const module = await importUnique('./shared_worker')
			const { sharedWorkerEntrypoint: destructuredEntrypoint } = module
			
			destructuredEntrypoint()
			expect(() => destructuredEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => module.sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})
	})

	describe('integration with portManager', () => {
		it('maintains call order integrity', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const localInitSpy = vi.spyOn(portManager, 'init')
			const callOrder: string[] = []
			
			localInitSpy.mockImplementation(() => {
				callOrder.push('portManager.init')
			})
			
			callOrder.push('before-call')
			sharedWorkerEntrypoint()
			callOrder.push('after-call')
			
			expect(callOrder).toEqual(['before-call', 'portManager.init', 'after-call'])
		})

		it('does not interfere with portManager state on failed calls', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const localInitSpy = vi.spyOn(portManager, 'init')
			
			sharedWorkerEntrypoint() // First successful call
			
			// Subsequent failed calls should not call portManager.init
			try { sharedWorkerEntrypoint() } catch { /* ignore */ }
			try { sharedWorkerEntrypoint() } catch { /* ignore */ }
			
			expect(localInitSpy).toHaveBeenCalledOnce()
		})
	})

	describe('TypeScript generic behavior', () => {
		it('can be called with explicit type parameter', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			expect(() => sharedWorkerEntrypoint<unknown>()).not.toThrow()
		})

		it('maintains double-call protection with generic types', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			sharedWorkerEntrypoint<unknown>()
			expect(() => sharedWorkerEntrypoint<string>()).toThrow(WorkerDoubleInitError)
		})
	})

	describe('edge cases and boundary conditions', () => {
		it('handles being called in try-catch blocks correctly', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			let firstCallSucceeded = false
			let secondCallThrew = false
			
			try {
				sharedWorkerEntrypoint()
				firstCallSucceeded = true
			} catch {
				// Should not happen
			}
			
			try {
				sharedWorkerEntrypoint()
			} catch (error) {
				secondCallThrew = error instanceof WorkerDoubleInitError
			}
			
			expect(firstCallSucceeded).toBe(true)
			expect(secondCallThrew).toBe(true)
		})

		it('works correctly when called indirectly through variables', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const func = sharedWorkerEntrypoint
			const obj = { method: sharedWorkerEntrypoint }
			
			func() // First call succeeds
			expect(() => obj.method()).toThrow(WorkerDoubleInitError)
		})

		it('maintains state after being assigned to different variables', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const alias1 = sharedWorkerEntrypoint
			const alias2 = sharedWorkerEntrypoint
			
			alias1()
			expect(() => alias2()).toThrow(WorkerDoubleInitError)
		})
	})

	describe('performance and memory characteristics', () => {
		it('does not accumulate memory with repeated failed calls', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint() // First successful call
			
			// Many failed calls should not accumulate state or cause memory issues
			for (let i = 0; i < 1000; i++) {
				expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			}
			
			// State should still be consistent
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it('executes quickly on subsequent calls (early return)', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const localInitSpy = vi.spyOn(portManager, 'init')
			
			sharedWorkerEntrypoint() // First call
			
			const start = performance.now()
			try { sharedWorkerEntrypoint() } catch { /* ignore */ } // Should return quickly
			const end = performance.now()
			
			// Should execute very quickly since it returns early
			expect(end - start).toBeLessThan(1) // Less than 1ms
			expect(localInitSpy).toHaveBeenCalledOnce() // Should not call init again
		})
	})
})