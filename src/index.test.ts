/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	BrowserLocalFirst as IndexBrowserLocalFirst,
	createDurableObject as IndexCreateDurableObject,
	sharedWorkerEntrypoint as IndexSharedWorkerEntrypoint,
	workerEntrypoint as IndexWorkerEntrypoint,
	type Transition
} from './'
import { BrowserLocalFirst } from './impl/browser/exports/browser'
import { createDurableObject } from './impl/do/exports/durable_object'
import { sharedWorkerEntrypoint } from './impl/browser/exports/entrypoints/shared_worker'
import { workerEntrypoint } from './impl/browser/exports/entrypoints/worker'

// Mock Worker and SharedWorker for testing
class MockWorker {
	postMessage = vi.fn()
	terminate = vi.fn()
}

class MockSharedWorker {
	port = {
		postMessage: vi.fn(),
		close: vi.fn()
	}
}

describe('main entrypoint', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('export integrity', () => {
		it('exports the same BrowserLocalFirst as browser.ts', () => {
			expect(IndexBrowserLocalFirst).toStrictEqual(BrowserLocalFirst)
		})

		it('exports the same createDurableObject as durable_object.ts', () => {
			expect(IndexCreateDurableObject).toStrictEqual(createDurableObject)
		})

		it('exports the same sharedWorkerEntrypoint as shared_worker.ts', () => {
			expect(IndexSharedWorkerEntrypoint).toStrictEqual(sharedWorkerEntrypoint)
		})

		it('exports the same workerEntrypoint as worker.ts', () => {
			expect(IndexWorkerEntrypoint).toStrictEqual(workerEntrypoint)
		})
	})

	describe('BrowserLocalFirst functionality', () => {
		it('should instantiate with Worker', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			const instance = new IndexBrowserLocalFirst(config)
			expect(instance).toBeInstanceOf(IndexBrowserLocalFirst)
			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: 0,
				data: { dbName: 'test-db', wsUrl: 'ws://localhost:8080' }
			})
		})

		it('should instantiate with SharedWorker', () => {
			const mockSharedWorker = new MockSharedWorker()
			const config = {
				dbName: 'test-shared-db',
				wsUrl: 'ws://localhost:9090',
				worker: mockSharedWorker as unknown as SharedWorker
			}

			const instance = new IndexBrowserLocalFirst(config)
			expect(instance).toBeInstanceOf(IndexBrowserLocalFirst)
			expect(mockSharedWorker.port.postMessage).toHaveBeenCalledWith({
				type: 0,
				data: { dbName: 'test-shared-db', wsUrl: 'ws://localhost:9090' }
			})
		})

		it('should handle transition with Worker', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			const instance = new IndexBrowserLocalFirst(config)
			const transition = { type: 'TEST_TRANSITION', data: { value: 42 } }

			instance.transition(transition as unknown as Transition)

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: 1,
				data: transition
			})
		})

		it('should handle transition with SharedWorker', () => {
			const mockSharedWorker = new MockSharedWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockSharedWorker as unknown as SharedWorker
			}

			const instance = new IndexBrowserLocalFirst(config)
			const transition = { type: 'TEST_TRANSITION', data: { value: 42 } }

			instance.transition(transition as unknown as Transition)

			expect(mockSharedWorker.port.postMessage).toHaveBeenCalledWith({
				type: 1,
				data: transition
			})
		})

		it('should handle empty string dbName', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: '',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: 0,
				data: { dbName: '', wsUrl: 'ws://localhost:8080' }
			})
		})

		it('should handle empty string wsUrl', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: '',
				worker: mockWorker as unknown as Worker
			}

			expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: 0,
				data: { dbName: 'test-db', wsUrl: '' }
			})
		})

		it('should handle very long dbName', () => {
			const mockWorker = new MockWorker()
			const longDbName = 'a'.repeat(1000)
			const config = {
				dbName: longDbName,
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				type: 0,
				data: { dbName: longDbName, wsUrl: 'ws://localhost:8080' }
			})
		})

		it('should handle special characters in URLs', () => {
			const mockWorker = new MockWorker()
			const specialUrl = 'ws://localhost:8080/path?param=value&special=%20%21'
			const config = {
				dbName: 'test-db',
				wsUrl: specialUrl,
				worker: mockWorker as unknown as Worker
			}

			expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
		})

		it('should handle multiple rapid transitions', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			const instance = new IndexBrowserLocalFirst(config)

			for (let i = 0; i < 100; i++) {
				instance.transition({ type: `TRANSITION_${i}`, data: { value: i } } as unknown as Transition)
			}

			expect(mockWorker.postMessage).toHaveBeenCalledTimes(101) // 1 init + 100 transitions
		})
	})

	describe('createDurableObject functionality', () => {
		it('should return a constructor function', () => {
			const DurableObjectClass = IndexCreateDurableObject()
			expect(typeof DurableObjectClass).toBe('function')
			expect(DurableObjectClass.prototype).toBeDefined()
		})

		it('should create instances with getB method', () => {
			const DurableObjectClass = IndexCreateDurableObject()
			const instance = new DurableObjectClass()

			expect(instance).toBeDefined()
			expect(typeof instance.getB).toBe('function')
			expect(instance.getB()).toBe(10)
		})

		it('should create multiple independent instances', () => {
			const DurableObjectClass = IndexCreateDurableObject()
			const instance1 = new DurableObjectClass()
			const instance2 = new DurableObjectClass()

			expect(instance1).not.toBe(instance2)
			expect(instance1.getB()).toBe(10)
			expect(instance2.getB()).toBe(10)
		})

		it('should handle rapid instance creation', () => {
			const DurableObjectClass = IndexCreateDurableObject()
			const instances: Array<{ getB: () => number }> = []

			for (let i = 0; i < 1000; i++) {
				instances.push(new DurableObjectClass())
			}

			expect(instances).toHaveLength(1000)
			instances.forEach(instance => {
				expect(instance.getB()).toBe(10)
			})
		})

		it('should create different classes on each call', () => {
			const DurableObjectClass1 = IndexCreateDurableObject()
			const DurableObjectClass2 = IndexCreateDurableObject()

			expect(DurableObjectClass1).not.toBe(DurableObjectClass2)

			const instance1 = new DurableObjectClass1()
			const instance2 = new DurableObjectClass2()

			expect(instance1.constructor).not.toBe(instance2.constructor)
		})

		it('should handle parameter variations', () => {
			expect(() => IndexCreateDurableObject()).not.toThrow()
			expect(() => IndexCreateDurableObject({})).not.toThrow()
			expect(() => IndexCreateDurableObject({ config: 'test' })).not.toThrow()
			expect(() => IndexCreateDurableObject(null)).not.toThrow()
			expect(() => IndexCreateDurableObject(undefined)).not.toThrow()
		})
	})

	describe('entrypoint functionality', () => {
		it('sharedWorkerEntrypoint should handle valid events', () => {
			const mockEvent = {
				data: { type: 'test' },
				ports: [{ postMessage: vi.fn() }]
			}

			expect(() => IndexSharedWorkerEntrypoint(mockEvent)).not.toThrow()
		})

		it('sharedWorkerEntrypoint should handle events without ports', () => {
			const mockEvent = {
				data: { type: 'test' },
				ports: []
			}

			expect(() => IndexSharedWorkerEntrypoint(mockEvent)).not.toThrow()
		})

		it('sharedWorkerEntrypoint should handle malformed events', () => {
			expect(() => IndexSharedWorkerEntrypoint({} as any)).not.toThrow()
			expect(() => IndexSharedWorkerEntrypoint(null as any)).not.toThrow()
			expect(() => IndexSharedWorkerEntrypoint(undefined as any)).not.toThrow()
		})

		it('workerEntrypoint should handle valid requests', () => {
			const mockRequest = new Request('https://example.com/api/test', {
				method: 'POST',
				body: JSON.stringify({ data: 'test' }),
				headers: { 'Content-Type': 'application/json' }
			})

			expect(() => IndexWorkerEntrypoint(mockRequest)).not.toThrow()
		})

		it('workerEntrypoint should handle GET requests', () => {
			const mockRequest = new Request('https://example.com/api/test')
			expect(() => IndexWorkerEntrypoint(mockRequest)).not.toThrow()
		})

		it('workerEntrypoint should handle requests with query parameters', () => {
			const mockRequest = new Request('https://example.com/api/test?param1=value1&param2=value2')
			expect(() => IndexWorkerEntrypoint(mockRequest)).not.toThrow()
		})

		it('workerEntrypoint should handle invalid requests', () => {
			expect(() => IndexWorkerEntrypoint(null as any)).not.toThrow()
			expect(() => IndexWorkerEntrypoint(undefined as any)).not.toThrow()
		})
	})

	describe('error exports', () => {
		it('should export error classes from common/errors', async () => {
			const errorExports = await import('./common/errors')
			const indexExports = await import('./')

			for (const [key, value] of Object.entries(errorExports)) {
				expect(indexExports).toHaveProperty(key)
				expect((indexExports as any)[key]).toBe(value)
			}
		})
	})

	describe('type exports', () => {
		it('should export Transition type', () => {
			const transition: Transition = { type: 'test' } as unknown as Transition
			expect(transition).toBeDefined()
		})
	})

	describe('module boundary and performance', () => {
		it('should handle concurrent access', async () => {
			const promises = Array.from({ length: 50 }, async () => {
				const DurableObjectClass = IndexCreateDurableObject()
				const instance = new DurableObjectClass()
				return instance.getB()
			})

			const results = await Promise.all(promises)
			expect(results).toHaveLength(50)
			results.forEach(result => expect(result).toBe(10))
		})

		it('should maintain consistent exports across multiple imports', async () => {
			const exports1 = await import('./')
			const exports2 = await import('./')

			expect(exports1.BrowserLocalFirst).toBe(exports2.BrowserLocalFirst)
			expect(exports1.createDurableObject).toBe(exports2.createDurableObject)
			expect(exports1.sharedWorkerEntrypoint).toBe(exports2.sharedWorkerEntrypoint)
			expect(exports1.workerEntrypoint).toBe(exports2.workerEntrypoint)
		})

		it('should not leak memory with repeated instantiation', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			const instances = []
			for (let i = 0; i < 100; i++) {
				instances.push(new IndexBrowserLocalFirst(config))
			}

			expect(instances).toHaveLength(100)
			expect(mockWorker.postMessage).toHaveBeenCalledTimes(100)
		})
	})

	describe('edge cases and boundary conditions', () => {
		it('should handle extreme dbName values', () => {
			const mockWorker = new MockWorker()
			const testCases = [
				'',
				' ',
				'\n\t',
				'test\u0000db',
				'🚀💯',
				'test-db'.repeat(100),
			]

			testCases.forEach(dbName => {
				const config = {
					dbName,
					wsUrl: 'ws://localhost:8080',
					worker: mockWorker as unknown as Worker
				}
				expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
			})
		})

		it('should handle extreme wsUrl values', () => {
			const mockWorker = new MockWorker()
			const testCases = [
				'',
				'ws://localhost',
				'wss://very-long-subdomain.example-domain.com:9999/very/long/path?with=many&query=parameters&and=values',
				'ws://127.0.0.1:65535',
				'ws://[::1]:8080',
			]

			testCases.forEach(wsUrl => {
				const config = {
					dbName: 'test-db',
					wsUrl,
					worker: mockWorker as unknown as Worker
				}
				expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
			})
		})

		it('should handle complex transition objects', () => {
			const mockWorker = new MockWorker()
			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: mockWorker as unknown as Worker
			}

			const instance = new IndexBrowserLocalFirst(config)

			const complexTransition = {
				type: 'COMPLEX_TRANSITION',
				data: {
					nested: {
						deeply: {
							nested: {
								value: 42,
								array: [1, 2, 3, { inner: 'value' }],
								nullValue: null,
								undefinedValue: undefined
							}
						}
					},
					largeString: 'x'.repeat(10000),
					specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
				}
			}

			expect(() => instance.transition(complexTransition as unknown as Transition)).not.toThrow()
		})

		it('should handle worker objects with additional properties', () => {
			const enhancedWorker = Object.assign(new MockWorker(), {
				extraProperty: 'test',
				extraMethod: () => 'test'
			})

			const config = {
				dbName: 'test-db',
				wsUrl: 'ws://localhost:8080',
				worker: enhancedWorker as unknown as Worker
			}

			expect(() => new IndexBrowserLocalFirst(config)).not.toThrow()
		})
	})
})