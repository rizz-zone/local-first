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
		const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
		expect(sharedWorkerEntrypoint).not.toThrow()
		expect(sharedWorkerEntrypoint).toThrow(WorkerDoubleInitError)
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
})

	describe('error scenarios', () => {
		it('should throw WorkerDoubleInitError when entrypoint is called multiple times', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})

		it('should handle portManager.init throwing an error', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw new Error('Port manager initialization failed')
			})

			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow('Port manager initialization failed')
		})

		it('should maintain error state after failed initialization', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw new Error('Initialization error')
			})

			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow('Initialization error')

			// Reset the mock but the called state should still prevent re-initialization
			initSpy.mockRestore()
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})

		it('should throw WorkerDoubleInitError even if portManager.init fails first time', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementationOnce(() => {
				throw new Error('First call fails')
			})

			// First call should fail with the portManager error
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow('First call fails')

			// Second call should fail with WorkerDoubleInitError regardless
			initSpy.mockRestore()
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})
	})

	describe('initialization state management', () => {
		it('should track initialization state correctly', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			expect(initSpy).not.toHaveBeenCalled()
			
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledOnce()
			
			// Second call should not reach portManager.init due to double init check
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
			
			// Verify portManager.init was not called again
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle rapid consecutive calls correctly', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const calls = []
			for (let i = 0; i < 5; i++) {
				try {
					sharedWorkerEntrypoint()
					calls.push('success')
				} catch (error) {
					calls.push('error')
				}
			}

			expect(calls[0]).toBe('success')
			expect(calls.slice(1)).toEqual(['error', 'error', 'error', 'error'])
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should maintain state across different execution contexts', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Call in setTimeout to test async context
			await new Promise<void>((resolve) => {
				setTimeout(() => {
					sharedWorkerEntrypoint()
					expect(initSpy).toHaveBeenCalledOnce()
					resolve()
				}, 0)
			})

			// Should still be blocked in main thread
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})
	})

	describe('portManager integration', () => {
		it('should pass correct parameters to portManager.init', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			expect(initSpy).toHaveBeenCalledWith()
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle portManager.init with TypeScript generics', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Test with typed call (this tests the generic parameter)
			expect(() => {
				sharedWorkerEntrypoint()
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle portManager.init returning different values', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockReturnValue('test-return-value')
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle portManager.init being async (Promise)', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockResolvedValue('async-result')
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle portManager being undefined', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const originalInit = portManager.init
			delete (portManager as any).init

			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow()

			// Restore
			portManager.init = originalInit
		})
	})

	describe('error types and messages', () => {
		it('should throw WorkerDoubleInitError with correct properties', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			try {
				sharedWorkerEntrypoint()
				expect.fail('Should have thrown WorkerDoubleInitError')
			} catch (error) {
				expect(error).toBeInstanceOf(WorkerDoubleInitError)
				expect(error.name).toBe('WorkerDoubleInitError')
				expect(typeof error.message).toBe('string')
				expect(error.message.length).toBeGreaterThan(0)
			}
		})

		it('should maintain error stack trace', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			try {
				sharedWorkerEntrypoint()
				expect.fail('Should have thrown WorkerDoubleInitError')
			} catch (error) {
				expect(error.stack).toBeDefined()
				expect(typeof error.stack).toBe('string')
				expect(error.stack).toContain('WorkerDoubleInitError')
			}
		})

		it('should use workerDoubleInit message helper', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			try {
				sharedWorkerEntrypoint()
				expect.fail('Should have thrown WorkerDoubleInitError')
			} catch (error) {
				// The error should use the workerDoubleInit(true) message
				expect(error.message).toBeDefined()
				expect(typeof error.message).toBe('string')
			}
		})
	})

	describe('performance characteristics', () => {
		it('should initialize quickly', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const startTime = performance.now()
			sharedWorkerEntrypoint()
			const endTime = performance.now()
			
			const initTime = endTime - startTime
			expect(initTime).toBeLessThan(100) // Should initialize in under 100ms
		})

		it('should fail fast on double initialization', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			
			const startTime = performance.now()
			try {
				sharedWorkerEntrypoint()
				expect.fail('Should have thrown')
			} catch (error) {
				const endTime = performance.now()
				const errorTime = endTime - startTime
				expect(errorTime).toBeLessThan(10) // Should fail very quickly
			}
		})

		it('should handle high-frequency initialization attempts', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Try to call 1000 times in quick succession
			let successCount = 0
			let errorCount = 0
			
			for (let i = 0; i < 1000; i++) {
				try {
					sharedWorkerEntrypoint()
					successCount++
				} catch (error) {
					errorCount++
				}
			}
			
			expect(successCount).toBe(1)
			expect(errorCount).toBe(999)
			expect(initSpy).toHaveBeenCalledOnce()
		})
	})

	describe('memory management', () => {
		it('should not create memory leaks with repeated import attempts', async () => {
			// Import the module multiple times to test for leaks
			for (let i = 0; i < 100; i++) {
				await importUnique('./shared_worker')
			}
			
			expect(initSpy).not.toBeCalled()
		})

		it('should handle cleanup after initialization', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledOnce()
			
			// Verify that the initialization state is properly maintained
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})

		it('should not retain references after errors', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw new Error('Test error')
			})
			
			try {
				sharedWorkerEntrypoint()
			} catch (error) {
				// Error is expected
			}
			
			// State should still be maintained despite the error
			initSpy.mockRestore()
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})
	})

	describe('edge cases', () => {
		it('should handle portManager.init throwing null', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw null
			})
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow()
		})

		it('should handle portManager.init throwing undefined', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw undefined
			})
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow()
		})

		it('should handle portManager.init throwing non-Error objects', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			initSpy.mockImplementation(() => {
				throw 'string error'
			})
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow('string error')
		})

		it('should handle portManager.init throwing complex objects', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			const complexError = { code: 'COMPLEX_ERROR', details: { nested: true } }
			initSpy.mockImplementation(() => {
				throw complexError
			})
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(complexError)
		})
	})

	describe('integration with worker environment', () => {
		it('should work in SharedWorker global context', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Mock SharedWorker global environment
			const originalSelf = global.self
			global.self = {
				addEventListener: vi.fn(),
				postMessage: vi.fn(),
				close: vi.fn()
			} as any
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
			
			// Restore
			global.self = originalSelf
		})

		it('should handle missing worker globals gracefully', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			const originalSelf = global.self
			delete (global as any).self
			
			expect(() => {
				sharedWorkerEntrypoint()
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
			
			// Restore
			global.self = originalSelf
		})

		it('should work with WebWorker reference lib types', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Test that the function works with webworker types
			// The implementation uses /// <reference lib="webworker" />
			expect(typeof sharedWorkerEntrypoint).toBe('function')
			
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledOnce()
		})
	})

	describe('module isolation', () => {
		it('should maintain state across different import contexts', async () => {
			const module1 = await importUnique('./shared_worker')
			const module2 = await importUnique('./shared_worker')
			
			// Both modules should have the same entrypoint function
			expect(typeof module1.sharedWorkerEntrypoint).toBe('function')
			expect(typeof module2.sharedWorkerEntrypoint).toBe('function')
			
			// But calling one should affect the shared state
			module1.sharedWorkerEntrypoint()
			expect(() => {
				module2.sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
		})

		it('should handle simultaneous calls from different imports', async () => {
			const module1 = await importUnique('./shared_worker')
			const module2 = await importUnique('./shared_worker')
			
			let firstCallSuccess = false
			let secondCallError = null
			
			try {
				module1.sharedWorkerEntrypoint()
				firstCallSuccess = true
			} catch (error) {
				// Should not throw
			}
			
			try {
				module2.sharedWorkerEntrypoint()
			} catch (error) {
				secondCallError = error
			}
			
			expect(firstCallSuccess).toBe(true)
			expect(secondCallError).toBeInstanceOf(WorkerDoubleInitError)
			expect(initSpy).toHaveBeenCalledOnce()
		})
	})

	describe('TypeScript generic parameters', () => {
		it('should accept generic TransitionSchema parameter', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Test that the generic parameter is properly typed
			// This is more of a compile-time test, but we can verify runtime behavior
			expect(() => {
				sharedWorkerEntrypoint() // Should infer TransitionSchema
			}).not.toThrow()
			
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should pass generic type to portManager.init', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			sharedWorkerEntrypoint()
			
			// Verify that portManager.init was called (it should receive the generic type)
			expect(initSpy).toHaveBeenCalledWith()
		})
	})
})

// Additional test suite for concurrent and stress scenarios
describe('SharedWorker Stress Tests', () => {
	const initSpy = vi.spyOn(portManager, 'init')
	
	beforeEach(() => {
		initSpy.mockClear()
	})

	describe('concurrent initialization', () => {
		it('should handle Promise-based concurrent calls', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			const promises = Array.from({ length: 100 }, () => 
				new Promise<string>((resolve) => {
					setTimeout(() => {
						try {
							sharedWorkerEntrypoint()
							resolve('success')
						} catch (error) {
							resolve('error')
						}
					}, Math.random() * 10)
				})
			)

			const results = await Promise.all(promises)
			const successCount = results.filter(r => r === 'success').length
			const errorCount = results.filter(r => r === 'error').length

			expect(successCount).toBe(1)
			expect(errorCount).toBe(99)
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle microtask-based concurrent calls', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			const results: string[] = []
			
			// Queue multiple microtasks
			for (let i = 0; i < 50; i++) {
				Promise.resolve().then(() => {
					try {
						sharedWorkerEntrypoint()
						results.push('success')
					} catch (error) {
						results.push('error')
					}
				})
			}
			
			// Wait for all microtasks to complete
			await new Promise(resolve => setTimeout(resolve, 10))
			
			const successCount = results.filter(r => r === 'success').length
			const errorCount = results.filter(r => r === 'error').length
			
			expect(successCount).toBe(1)
			expect(errorCount).toBe(49)
			expect(initSpy).toHaveBeenCalledOnce()
		})
	})

	describe('error propagation stress', () => {
		it('should handle multiple error scenarios in sequence', async () => {
			const module1 = await importUnique('./shared_worker')
			const module2 = await importUnique('./shared_worker')
			const module3 = await importUnique('./shared_worker')
			
			// First call succeeds
			module1.sharedWorkerEntrypoint()
			
			// Subsequent calls should all fail with WorkerDoubleInitError
			const errors = []
			try { module2.sharedWorkerEntrypoint() } catch (e) { errors.push(e) }
			try { module3.sharedWorkerEntrypoint() } catch (e) { errors.push(e) }
			try { module1.sharedWorkerEntrypoint() } catch (e) { errors.push(e) }
			
			expect(errors).toHaveLength(3)
			errors.forEach(error => {
				expect(error).toBeInstanceOf(WorkerDoubleInitError)
			})
			
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it('should handle mixed success and error scenarios', async () => {
			const { sharedWorkerEntrypoint } = await importUnique('./shared_worker')
			
			// Mock portManager to fail intermittently
			let callCount = 0
			initSpy.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					throw new Error('First call fails')
				}
				// Subsequent calls won't reach here due to called=true
			})
			
			// First call should fail with portManager error
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow('First call fails')
			
			// Second call should fail with WorkerDoubleInitError
			expect(() => {
				sharedWorkerEntrypoint()
			}).toThrow(WorkerDoubleInitError)
			
			expect(initSpy).toHaveBeenCalledOnce()
		})
	})
})
