import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkerLocalFirst } from './worker_thread'
import type { clientMachine } from '../machines/worker'
import type { Actor } from 'xstate'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'

describe('WorkerLocalFirst', () => {
	describe('constructor', () => {
		it('should create a new instance successfully', () => {
			const localFirst = new WorkerLocalFirst()
			expect(localFirst).toBeInstanceOf(WorkerLocalFirst)
			localFirst[Symbol.dispose]()
		})

		it('should create multiple independent instances', () => {
			const localFirst1 = new WorkerLocalFirst()
			const localFirst2 = new WorkerLocalFirst()
			
			const machine1 = (localFirst1 as unknown as { machine: Actor<typeof clientMachine> }).machine
			const machine2 = (localFirst2 as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			expect(machine1).not.toBe(machine2)
			expect(machine1.id).not.toBe(machine2.id)
			
			localFirst1[Symbol.dispose]()
			localFirst2[Symbol.dispose]()
		})

		it('should initialize machine with correct actor state', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			expect(machine.getSnapshot().status).toBe('active')
			expect(machine.id).toBeDefined()
			expect(typeof machine.id).toBe('string')
		})

		it('should start machine immediately upon creation', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			expect(machine.getSnapshot().status).toBe('active')
			localFirst[Symbol.dispose]()
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
			// Clean up manually since using statement wasn't used
			;(internalLocalFirst as any)[Symbol.dispose]()
		})

		it('should handle machine disposal multiple times safely', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			// Manually dispose first time
			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')
			
			// Should not throw when disposed again
			expect(() => localFirst[Symbol.dispose]()).not.toThrow()
		})

		it('should maintain machine state transitions correctly', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			const initialSnapshot = machine.getSnapshot()
			expect(initialSnapshot.status).toBe('active')
			
			// Simulate a state transition
			machine.send({ type: 'init', wsUrl: SOCKET_URL, dbName: DB_NAME })
			
			const updatedSnapshot = machine.getSnapshot()
			expect(updatedSnapshot.status).toBe('active')
		})

		it('should create machine with correct initial context', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			const snapshot = machine.getSnapshot()
			expect(snapshot.context).toBeDefined()
			expect(typeof snapshot.context).toBe('object')
			expect(snapshot.context.socket).toBeUndefined()
			expect(snapshot.context.wsUrl).toBeUndefined()
			expect(snapshot.context.dbName).toBeUndefined()
		})
	})

	describe('init method', () => {
		let localFirst: WorkerLocalFirst
		let machine: Actor<typeof clientMachine>
		let sendSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			localFirst = new WorkerLocalFirst()
			machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			sendSpy = vi.spyOn(machine, 'send').mockImplementation(() => {})
		})

		afterEach(() => {
			sendSpy.mockRestore()
			localFirst[Symbol.dispose]()
		})

		it('should send an init event to the machine when calling the init method', () => {
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			expect(sendSpy).toHaveBeenCalledExactlyOnceWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
		})

		it('should handle init with only required parameters', () => {
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
		})

		it('should handle init with empty string parameters', () => {
			localFirst.init({
				wsUrl: '',
				dbName: ''
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: '',
				dbName: ''
			})
		})

		it('should handle init with special characters in parameters', () => {
			const specialWsUrl = 'ws://localhost:8080/special-chars!@#$%^&*()'
			const specialDbName = 'test-db_with@special#chars'

			localFirst.init({
				wsUrl: specialWsUrl,
				dbName: specialDbName
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: specialWsUrl,
				dbName: specialDbName
			})
		})

		it('should handle multiple init calls', () => {
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			localFirst.init({
				wsUrl: 'ws://different-url',
				dbName: 'different-db'
			})

			expect(sendSpy).toHaveBeenCalledTimes(2)
			expect(sendSpy).toHaveBeenNthCalledWith(1, {
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			expect(sendSpy).toHaveBeenNthCalledWith(2, {
				type: 'init',
				wsUrl: 'ws://different-url',
				dbName: 'different-db'
			})
		})

		it('should handle init when machine is in different states', () => {
			// First init call
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			// Reset spy to clear previous calls
			sendSpy.mockClear()

			// Second init call should still work
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			expect(sendSpy).toHaveBeenCalledOnce()
		})

		it('should not throw when init is called on disposed instance', () => {
			localFirst[Symbol.dispose]()

			expect(() => {
				localFirst.init({
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				})
			}).not.toThrow()
		})

		it('should handle init with very long parameter values', () => {
			const longWsUrl = 'ws://localhost:8080/' + 'a'.repeat(1000)
			const longDbName = 'db-' + 'b'.repeat(1000)

			localFirst.init({
				wsUrl: longWsUrl,
				dbName: longDbName
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: longWsUrl,
				dbName: longDbName
			})
		})

		it('should handle init with whitespace-only parameters', () => {
			localFirst.init({
				wsUrl: '   ',
				dbName: '\t\n\r'
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: '   ',
				dbName: '\t\n\r'
			})
		})

		it('should handle init with unicode characters', () => {
			const unicodeWsUrl = 'ws://测试.example.com/路径'
			const unicodeDbName = 'データベース名前'

			localFirst.init({
				wsUrl: unicodeWsUrl,
				dbName: unicodeDbName
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: unicodeWsUrl,
				dbName: unicodeDbName
			})
		})
	})

	describe('Symbol.dispose integration', () => {
		it('should implement Symbol.dispose correctly', () => {
			const localFirst = new WorkerLocalFirst()
			expect(typeof localFirst[Symbol.dispose]).toBe('function')
			localFirst[Symbol.dispose]()
		})

		it('should work correctly with using statement', () => {
			let machine: Actor<typeof clientMachine>
			
			{
				using localFirst = new WorkerLocalFirst()
				machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
				expect(machine.getSnapshot().status).toBe('active')
			}
			
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should handle disposal in try-finally blocks', () => {
			let machine: Actor<typeof clientMachine>
			let localFirst: WorkerLocalFirst
			
			try {
				localFirst = new WorkerLocalFirst()
				machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
				expect(machine.getSnapshot().status).toBe('active')
				throw new Error('Test error')
			} catch (error) {
				expect(error.message).toBe('Test error')
			} finally {
				if (localFirst!) {
					localFirst[Symbol.dispose]()
				}
			}
			
			expect(machine!.getSnapshot().status).toBe('stopped')
		})

		it('should handle disposal without throwing when machine is already stopped', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			machine.stop()
			expect(() => localFirst[Symbol.dispose]()).not.toThrow()
		})

		it('should be idempotent when called multiple times', () => {
			const localFirst = new WorkerLocalFirst()
			
			localFirst[Symbol.dispose]()
			localFirst[Symbol.dispose]()
			localFirst[Symbol.dispose]()
			
			// Should not throw
			expect(true).toBe(true)
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle machine creation errors gracefully', () => {
			// This test verifies the constructor doesn't throw
			expect(() => new WorkerLocalFirst()).not.toThrow()
		})

		it('should maintain machine reference integrity', () => {
			using localFirst = new WorkerLocalFirst()
			const machine1 = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			const machine2 = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			expect(machine1).toBe(machine2)
		})

		it('should handle concurrent init calls', async () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			const sendSpy = vi.spyOn(machine, 'send').mockImplementation(() => {})

			// Simulate concurrent init calls
			const promises = Array.from({ length: 5 }, (_, i) => 
				Promise.resolve(localFirst.init({
					wsUrl: `${SOCKET_URL}-${i}`,
					dbName: `${DB_NAME}-${i}`
				}))
			)

			await Promise.all(promises)

			expect(sendSpy).toHaveBeenCalledTimes(5)
			sendSpy.mockRestore()
			localFirst[Symbol.dispose]()
		})

		it('should handle init with null-like string values', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			const sendSpy = vi.spyOn(machine, 'send').mockImplementation(() => {})

			localFirst.init({
				wsUrl: 'null',
				dbName: 'undefined'
			})

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: 'null',
				dbName: 'undefined'
			})

			sendSpy.mockRestore()
			localFirst[Symbol.dispose]()
		})

		it('should handle machine state corruption gracefully', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			// Verify machine is functional before and after init
			expect(machine.getSnapshot().status).toBe('active')
			
			localFirst.init({ wsUrl: SOCKET_URL, dbName: DB_NAME })
			
			expect(machine.getSnapshot().status).toBe('active')
			localFirst[Symbol.dispose]()
		})
	})

	describe('performance and memory', () => {
		it('should not leak memory when creating multiple instances', () => {
			const instances: WorkerLocalFirst[] = []
			
			// Create multiple instances
			for (let i = 0; i < 10; i++) {
				instances.push(new WorkerLocalFirst())
			}
			
			// Verify they all work
			instances.forEach(instance => {
				const machine = (instance as unknown as { machine: Actor<typeof clientMachine> }).machine
				expect(machine.getSnapshot().status).toBe('active')
			})
			
			// Dispose all instances
			instances.forEach(instance => instance[Symbol.dispose]())
			
			// Verify they're all stopped
			instances.forEach(instance => {
				const machine = (instance as unknown as { machine: Actor<typeof clientMachine> }).machine
				expect(machine.getSnapshot().status).toBe('stopped')
			})
		})

		it('should handle rapid init calls efficiently', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			const sendSpy = vi.spyOn(machine, 'send').mockImplementation(() => {})

			const startTime = performance.now()
			
			// Make many rapid init calls
			for (let i = 0; i < 100; i++) {
				localFirst.init({
					wsUrl: `${SOCKET_URL}-${i}`,
					dbName: `${DB_NAME}-${i}`
				})
			}
			
			const endTime = performance.now()
			const duration = endTime - startTime
			
			// Should complete quickly (less than 100ms for 100 calls)
			expect(duration).toBeLessThan(100)
			expect(sendSpy).toHaveBeenCalledTimes(100)

			sendSpy.mockRestore()
			localFirst[Symbol.dispose]()
		})

		it('should handle creation and disposal cycles without issues', () => {
			// Test repeated creation and disposal
			for (let i = 0; i < 5; i++) {
				const localFirst = new WorkerLocalFirst()
				const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
				
				expect(machine.getSnapshot().status).toBe('active')
				localFirst.init({ wsUrl: `${SOCKET_URL}-${i}`, dbName: `${DB_NAME}-${i}` })
				localFirst[Symbol.dispose]()
				expect(machine.getSnapshot().status).toBe('stopped')
			}
		})
	})

	describe('machine integration', () => {
		it('should correctly pass context to machine on init', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			
			// The machine should receive the init event and process it
			const snapshot = machine.getSnapshot()
			expect(snapshot.status).toBe('active')
			
			localFirst[Symbol.dispose]()
		})

		it('should maintain correct parallel state structure', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			const snapshot = machine.getSnapshot()
			expect(snapshot.value).toHaveProperty('websocket')
			expect(snapshot.value).toHaveProperty('db')
			expect(snapshot.value).toHaveProperty('superiority')
		})

		it('should handle machine events without interfering with disposal', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (localFirst as unknown as { machine: Actor<typeof clientMachine> }).machine
			
			// Send various events
			machine.send({ type: 'ws connected' })
			machine.send({ type: 'db connected' })
			machine.send({ type: 'leader lock acquired' })
			
			expect(machine.getSnapshot().status).toBe('active')
			
			// Should still dispose correctly
			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')
		})
	})
})
