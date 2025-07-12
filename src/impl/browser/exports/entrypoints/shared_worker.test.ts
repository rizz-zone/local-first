import { vi, beforeEach, describe, expect, it } from 'vitest'
import { sharedWorkerEntrypoint } from './shared_worker'
import { WorkerDoubleInitError } from '../../../../common/errors'
import { portManager } from '../../helpers/port_manager'
import { importUnique } from '../../../../testing/dynamic_import'

describe("SharedWorker entrypoint", () => {
	const initSpy = vi.spyOn(portManager, "init")
	beforeEach(() => {
		initSpy.mockClear()
	})

	describe("initialization behavior", () => {
		it("does not call portManager.init if not invoked", async () => {
			await importUnique("./shared_worker")
			expect(initSpy).not.toBeCalled()
		})

		it("calls portManager.init when invoked", () => {
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledOnce()
		})

		it("calls portManager.init with no arguments", () => {
			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledWith()
		})

		it("returns undefined on successful execution", () => {
			const result = sharedWorkerEntrypoint()
			expect(result).toBeUndefined()
		})

		it("executes synchronously", () => {
			const before = Date.now()
			sharedWorkerEntrypoint()
			const after = Date.now()
			expect(after - before).toBeLessThan(10) // Should complete very quickly
		})

		it("works with TypeScript generic parameter", () => {
			expect(() => sharedWorkerEntrypoint<unknown>()).not.toThrow()
		})
	})

	describe("double initialization protection", () => {
		it("can only be called once", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			expect(() => sharedWorkerEntrypoint()).not.toThrow()
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it("throws WorkerDoubleInitError on second call", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			sharedWorkerEntrypoint() // First call
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it("throws WorkerDoubleInitError on multiple subsequent calls", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			sharedWorkerEntrypoint() // First call

			for (let i = 0; i < 5; i++) {
				expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			}
		})

		it("does not call portManager.init on second invocation", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			sharedWorkerEntrypoint() // First call

			initSpy.mockClear()
			try {
				sharedWorkerEntrypoint() // Second call should throw
			} catch (error) {
				expect(error).toBeInstanceOf(WorkerDoubleInitError)
			}
			expect(initSpy).not.toHaveBeenCalled()
		})

		it("preserves double-init protection even with generic types", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			sharedWorkerEntrypoint<unknown>() // First call with generic
			expect(() => sharedWorkerEntrypoint<unknown>()).toThrow(WorkerDoubleInitError)
		})
	})

	describe("error handling and edge cases", () => {
		it("handles portManager.init throwing an error", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			const testError = new Error("Port manager init failed")
			initSpy.mockImplementation(() => {
				throw testError
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(testError)
		})

		it("maintains initialization state even if portManager.init fails", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			const initError = new Error("Init failed")
			initSpy.mockImplementation(() => {
				throw initError
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(initError)

			initSpy.mockRestore()

			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it("does not call portManager.init if already failed once", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			const initError = new Error("Init failed")
			initSpy.mockImplementation(() => {
				throw initError
			})

			try {
				sharedWorkerEntrypoint()
			} catch (error) {
				expect(error).toBe(initError)
			}

			initSpy.mockClear()
			initSpy.mockImplementation(() => {
				// Should not be called
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(initSpy).not.toHaveBeenCalled()
		})

		it("handles rapid successive calls correctly", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")

			sharedWorkerEntrypoint()

			const errors: Error[] = []
			for (let i = 0; i < 10; i++) {
				try {
					sharedWorkerEntrypoint()
				} catch (error) {
					errors.push(error as Error)
				}
			}

			expect(errors).toHaveLength(10)
			errors.forEach(error => {
				expect(error).toBeInstanceOf(WorkerDoubleInitError)
			})

			expect(initSpy).toHaveBeenCalledTimes(1)
		})

		it("handles being called with different generic type parameters", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")

			sharedWorkerEntrypoint<{ type: "test" }>()
			expect(() => sharedWorkerEntrypoint<{ type: "different" }>()).toThrow(WorkerDoubleInitError)
		})
	})

	describe("integration with portManager", () => {
		it("calls portManager.init exactly once regardless of multiple attempts", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")

			sharedWorkerEntrypoint()
			expect(initSpy).toHaveBeenCalledTimes(1)

			for (let i = 0; i < 3; i++) {
				try {
					sharedWorkerEntrypoint()
				} catch (error) {
					expect(error).toBeInstanceOf(WorkerDoubleInitError)
				}
			}

			expect(initSpy).toHaveBeenCalledTimes(1)
		})

		it("passes through any exceptions from portManager.init", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			const customError = new Error("Custom port manager error")
			initSpy.mockImplementation(() => {
				throw customError
			})

			expect(() => sharedWorkerEntrypoint()).toThrow(customError)
			expect(() => sharedWorkerEntrypoint()).not.toThrow(customError) // Should throw WorkerDoubleInitError instead
			expect(() => sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})

		it("does not modify portManager behavior beyond calling init", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")

			const originalInit = portManager.init
			sharedWorkerEntrypoint()

			expect(portManager.init).toBe(originalInit)
			expect(initSpy).toHaveBeenCalledWith()
		})
	})

	describe("module loading and isolation behavior", () => {
		it("maintains separate initialization state per dynamic import", async () => {
			const module1 = await importUnique("./shared_worker")
			const module2 = await importUnique("./shared_worker")

			expect(() => module1.sharedWorkerEntrypoint()).not.toThrow()
			expect(() => module2.sharedWorkerEntrypoint()).not.toThrow()

			expect(() => module1.sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => module2.sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)

			expect(initSpy).toHaveBeenCalledTimes(2)
		})

		it("can be imported and called immediately", async () => {
			const { sharedWorkerEntrypoint: freshEntrypoint } = await importUnique("./shared_worker")
			expect(() => freshEntrypoint()).not.toThrow()
			expect(initSpy).toHaveBeenCalledTimes(1)
		})

		it("preserves function identity within same import", async () => {
			const module = await importUnique("./shared_worker")
			const fn1 = module.sharedWorkerEntrypoint
			const fn2 = module.sharedWorkerEntrypoint
			expect(fn1).toBe(fn2)
		})

		it("has different function references across different imports", async () => {
			const module1 = await importUnique("./shared_worker")
			const module2 = await importUnique("./shared_worker")

			expect(module1.sharedWorkerEntrypoint).not.toBe(module2.sharedWorkerEntrypoint)
		})

		it("maintains separate called state across module boundaries", async () => {
			const module1 = await importUnique("./shared_worker")
			const module2 = await importUnique("./shared_worker")

			module1.sharedWorkerEntrypoint()
			expect(() => module2.sharedWorkerEntrypoint()).not.toThrow()
			expect(() => module1.sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
			expect(() => module2.sharedWorkerEntrypoint()).toThrow(WorkerDoubleInitError)
		})
	})

	describe("function signature and type safety", () => {
		it("accepts generic type parameter without runtime effect", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")

			interface TestTransition { type: "test"; data: string }
			expect(() => sharedWorkerEntrypoint<TestTransition>()).not.toThrow()
		})

		it("can be called without explicit type parameter", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			expect(() => sharedWorkerEntrypoint()).not.toThrow()
		})

		it("returns void/undefined", async () => {
			const { sharedWorkerEntrypoint } = await importUnique("./shared_worker")
			const result = sharedWorkerEntrypoint()
			expect(result).toBeUndefined()
		})
	})
})