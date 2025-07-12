import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkerLocalFirst } from './worker_thread'
import type { clientMachine } from '../machines/worker'
import type { Actor } from 'xstate'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'

describe('WorkerLocalFirst', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		// Setup console spy to capture any error logs
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		// Clean up spies
		consoleSpy.mockRestore()
		vi.clearAllMocks()
	})

	describe('constructor', () => {
		it('should create a new instance with initialized machine', () => {
			using localFirst = new WorkerLocalFirst()
			
			expect(localFirst).toBeInstanceOf(WorkerLocalFirst)
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine
			expect(machine).toBeDefined()
			expect(machine.getSnapshot().status).toEqual('active')
		})

		it('should create multiple independent instances', () => {
			using localFirst1 = new WorkerLocalFirst()
			using localFirst2 = new WorkerLocalFirst()
			
			const machine1 = (
				localFirst1 as unknown as { machine: Actor<typeof clientMachine> }
			).machine
			const machine2 = (
				localFirst2 as unknown as { machine: Actor<typeof clientMachine> }
			).machine
			
			expect(machine1).not.toBe(machine2)
			expect(machine1.getSnapshot().status).toEqual('active')
			expect(machine2.getSnapshot().status).toEqual('active')
		})

		it('should start the machine immediately upon construction', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Verify machine is started (status should be 'active')
			expect(machine.getSnapshot().status).toEqual('active')
		})
	})

	describe('machine lifecycle management', () => {
		it('should initialise with the correct machine state', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const snapshot = machine.getSnapshot()
			expect(snapshot.status).toEqual('active')
			expect(snapshot.value).toEqual({
				websocket: 'disconnected',
				db: 'disconnected',
				superiority: 'follower'
			})
		})

		it('should stop the machine if it leaves scope while using using', () => {
			let machine
			{
				using internalLocalFirst = new WorkerLocalFirst()
				machine = (
					internalLocalFirst as unknown as {
						machine: Actor<typeof clientMachine>
					}
				).machine
			}
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should not stop the machine it if leaves scope while using const', () => {
			let machine
			{
				const internalLocalFirst = new WorkerLocalFirst()
				machine = (
					internalLocalFirst as unknown as {
						machine: Actor<typeof clientMachine>
					}
				).machine
			}
			expect(machine.getSnapshot().status).toBe('active')
		})

		it('should handle multiple disposals gracefully', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Manual disposal
			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')

			// Should not throw on second disposal
			expect(() => localFirst[Symbol.dispose]()).not.toThrow()
		})

		it('should maintain separate machine states for concurrent instances', () => {
			using localFirst1 = new WorkerLocalFirst()
			using localFirst2 = new WorkerLocalFirst()
			
			const machine1 = (localFirst1 as unknown as { machine: Actor<typeof clientMachine> }).machine
			const machine2 = (localFirst2 as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			// Initialize one instance
			localFirst1.init({ wsUrl: SOCKET_URL, dbName: DB_NAME })
			
			// Check that machines have independent states
			expect(machine1.getSnapshot().status).toEqual('active')
			expect(machine2.getSnapshot().status).toEqual('active')
			expect(machine1).not.toBe(machine2)
		})
	})

	describe('init method', () => {
		it('should send an init event to the machine when calling the init method', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as {
					machine: Actor<typeof clientMachine>
				}
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			expect(mock).toHaveBeenCalledExactlyOnceWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
		})

		it('should handle init with minimum required parameters', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
		})

		it('should handle init with different websocket URLs', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const customWsUrl = 'wss://custom-server.example.com'
			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			localFirst.init({
				wsUrl: customWsUrl,
				dbName: DB_NAME
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: customWsUrl,
				dbName: DB_NAME
			})
		})

		it('should handle init with different database names', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const customDbName = 'custom-database'
			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: customDbName
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: customDbName
			})
		})

		it('should handle multiple init calls', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			// First init
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			// Second init with different parameters
			localFirst.init({
				wsUrl: 'wss://another-server.com',
				dbName: 'another-db'
			})

			expect(mock).toHaveBeenCalledTimes(2)
			expect(mock).toHaveBeenNthCalledWith(1, {
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			expect(mock).toHaveBeenNthCalledWith(2, {
				type: 'init',
				wsUrl: 'wss://another-server.com',
				dbName: 'another-db'
			})
		})

		it('should not throw when initializing a disposed instance', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Dispose the instance
			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')

			// Should not throw when trying to init
			expect(() => {
				localFirst.init({
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				})
			}).not.toThrow()
		})

		it('should preserve parameter types correctly', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			// Test with various valid URL formats
			const validUrls = [
				'ws://localhost:8080',
				'wss://example.com:443/path',
				'wss://subdomain.example.com/ws?token=abc123'
			]

			validUrls.forEach((url, index) => {
				localFirst.init({
					wsUrl: url,
					dbName: `test-db-${index}`
				})
			})

			expect(mock).toHaveBeenCalledTimes(validUrls.length)
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty string parameters gracefully', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			localFirst.init({
				wsUrl: '',
				dbName: ''
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: '',
				dbName: ''
			})
		})

		it('should handle machine send throwing an error', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const error = new Error('Machine send failed')
			vi.spyOn(machine, 'send').mockImplementation(() => {
				throw error
			})

			expect(() => {
				localFirst.init({
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				})
			}).toThrow('Machine send failed')
		})

		it('should handle special characters in parameters', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			const specialWsUrl = 'wss://test.com/path?param=value&other=123'
			const specialDbName = 'db-with-dashes_and_underscores.123'
			
			localFirst.init({
				wsUrl: specialWsUrl,
				dbName: specialDbName
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: specialWsUrl,
				dbName: specialDbName
			})
		})

		it('should handle unicode characters in parameters', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			const unicodeUrl = 'wss://测试.example.com/路径'
			const unicodeDbName = 'データベース名'
			
			localFirst.init({
				wsUrl: unicodeUrl,
				dbName: unicodeDbName
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: unicodeUrl,
				dbName: unicodeDbName
			})
		})

		it('should handle very long parameter strings', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			const longUrl = 'wss://example.com/' + 'a'.repeat(1000)
			const longDbName = 'db_' + 'x'.repeat(500)
			
			localFirst.init({
				wsUrl: longUrl,
				dbName: longDbName
			})

			expect(mock).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: longUrl,
				dbName: longDbName
			})
		})
	})

	describe('Symbol.dispose implementation', () => {
		it('should implement Symbol.dispose correctly', () => {
			const localFirst = new WorkerLocalFirst()
			
			expect(typeof localFirst[Symbol.dispose]).toBe('function')
		})

		it('should stop machine when disposed manually', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			expect(machine.getSnapshot().status).toBe('active')
			
			localFirst[Symbol.dispose]()
			
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should be idempotent when calling dispose multiple times', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')

			// Should not throw or change state on subsequent calls
			expect(() => localFirst[Symbol.dispose]()).not.toThrow()
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should not affect other instances when disposing one', () => {
			const localFirst1 = new WorkerLocalFirst()
			const localFirst2 = new WorkerLocalFirst()
			
			const machine1 = (localFirst1 as unknown as { machine: Actor<typeof clientMachine> }).machine
			const machine2 = (localFirst2 as unknown as { machine: Actor<typeof clientMachine> }).machine

			localFirst1[Symbol.dispose]()
			
			expect(machine1.getSnapshot().status).toBe('stopped')
			expect(machine2.getSnapshot().status).toBe('active')
			
			// Clean up
			localFirst2[Symbol.dispose]()
		})
	})

	describe('type safety and interface compliance', () => {
		it('should accept valid init parameters', () => {
			const localFirst = new WorkerLocalFirst()
			
			// Should not throw for valid parameters
			expect(() => {
				localFirst.init({
					wsUrl: 'wss://valid-url.com',
					dbName: 'valid-db-name'
				})
			}).not.toThrow()
		})

		it('should maintain type safety with machine access', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Should have expected machine methods
			expect(typeof machine.getSnapshot).toBe('function')
			expect(typeof machine.send).toBe('function')
			expect(typeof machine.stop).toBe('function')
		})

		it('should have consistent machine reference', () => {
			using localFirst = new WorkerLocalFirst()
			const.machine1 = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine
			const.machine2 = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			expect(machine1).toBe(machine2)
		})
	})

	describe('integration with using statement', () => {
		it('should work correctly with nested using statements', () => {
			let outerMachine: Actor<typeof clientMachine>
			let innerMachine: Actor<typeof clientMachine>

			{
				using outer = new WorkerLocalFirst()
				outerMachine = (outer as unknown as { machine: Actor<typeof clientMachine> }).machine
				
				{
					using inner = new WorkerLocalFirst()
					innerMachine = (inner as unknown as { machine: Actor<typeof clientMachine> }).machine
					
					expect(outerMachine.getSnapshot().status).toBe('active')
					expect(innerMachine.getSnapshot().status).toBe('active')
				}
				
				// Inner should be disposed, outer should still be active
				expect(innerMachine.getSnapshot().status).toBe('stopped')
				expect(outerMachine.getSnapshot().status).toBe('active')
			}
			
			// Both should be disposed now
			expect(outerMachine.getSnapshot().status).toBe('stopped')
			expect(innerMachine.getSnapshot().status).toBe('stopped')
		})

		it('should handle exceptions during using block gracefully', () => {
			let machine: Actor<typeof clientMachine>
			
			expect(() => {
				try {
					using localFirst = new WorkerLocalFirst()
					machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
					
					// Simulate an error
					throw new Error('Test error')
				} catch (error) {
					// Error should be caught and machine should still be disposed
					expect((error as Error).message).toBe('Test error')
				}
			}).not.toThrow()
			
			// Machine should be disposed even after exception
			expect(machine!.getSnapshot().status).toBe('stopped')
		})

		it('should support resource management in loops', () => {
			const machines: Actor<typeof clientMachine>[] = []
			
			// Create multiple instances in a loop
			for (let i = 0; i < 3; i++) {
				using localFirst = new WorkerLocalFirst()
				const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
				machines.push(machine)
				
				expect(machine.getSnapshot().status).toBe('active')
			}
			
			// All machines should be disposed after leaving their scopes
			machines.forEach(machine => {
				expect(machine.getSnapshot().status).toBe('stopped')
			})
		})
	})

	describe('concurrent operations', () => {
		it('should handle rapid successive init calls', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			// Rapid successive calls
			for (let i = 0; i < 10; i++) {
				localFirst.init({
					wsUrl: `wss://server${i}.com`,
					dbName: `db${i}`
				})
			}

			expect(mock).toHaveBeenCalledTimes(10)
		})

		it('should handle init followed by immediate disposal', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mock = vi.spyOn(machine, 'send').mockImplementation(() => {})
			
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			
			localFirst[Symbol.dispose]()
			
			expect(mock).toHaveBeenCalledOnce()
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should maintain isolation between parallel instances', () => {
			const instances = Array.from({ length: 5 }, () => new WorkerLocalFirst())
			const machines = instances.map(instance => 
				(instance as unknown as { machine: Actor<typeof clientMachine> }).machine
			)
			
			// Each machine should be independent
			machines.forEach((machine, index) => {
				expect(machine.getSnapshot().status).toBe('active')
				expect(machine.getSnapshot().value).toEqual({
					websocket: 'disconnected',
					db: 'disconnected',
					superiority: 'follower'
				})
			})
			
			// Dispose all instances
			instances.forEach(instance => instance[Symbol.dispose]())
			
			// All should be stopped
			machines.forEach(machine => {
				expect(machine.getSnapshot().status).toBe('stopped')
			})
		})
	})
})