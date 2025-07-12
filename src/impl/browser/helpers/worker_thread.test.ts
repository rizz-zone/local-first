import { describe, it, expect, vi } from 'vitest'
import { WorkerLocalFirst } from './worker_thread'
import type { clientMachine } from '../machines/worker'
import type { Actor } from 'xstate'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'

describe('WorkerLocalFirst', () => {
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
	})
})

	describe('error handling', () => {
		it('should handle machine errors gracefully', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Mock machine.send to throw an error
			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {
				throw new Error('Machine error')
			})

			expect(() => {
				localFirst.init({
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				})
			}).toThrow('Machine error')

			mockSend.mockRestore()
		})

		it('should handle undefined or null init parameters', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			// Test with undefined parameters
			localFirst.init(undefined as any)
			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: undefined,
				dbName: undefined
			})

			// Test with null parameters  
			localFirst.init(null as any)
			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: undefined,
				dbName: undefined
			})

			mockSend.mockRestore()
		})

		it('should handle empty string parameters', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			localFirst.init({
				wsUrl: '',
				dbName: ''
			})

			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: '',
				dbName: ''
			})

			mockSend.mockRestore()
		})
	})

	describe('multiple instances', () => {
		it('should create independent machine instances', () => {
			using localFirst1 = new WorkerLocalFirst()
			using localFirst2 = new WorkerLocalFirst()

			const machine1 = (
				localFirst1 as unknown as { machine: Actor<typeof clientMachine> }
			).machine
			const machine2 = (
				localFirst2 as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			expect(machine1).not.toBe(machine2)
			expect(machine1.getSnapshot().status).toBe('active')
			expect(machine2.getSnapshot().status).toBe('active')
		})

		it('should handle multiple init calls on the same instance', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			// First init call
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			// Second init call with different parameters
			localFirst.init({
				wsUrl: 'ws://different-url',
				dbName: 'different-db'
			})

			expect(mockSend).toHaveBeenCalledTimes(2)
			expect(mockSend).toHaveBeenNthCalledWith(1, {
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			expect(mockSend).toHaveBeenNthCalledWith(2, {
				type: 'init',
				wsUrl: 'ws://different-url',
				dbName: 'different-db'
			})

			mockSend.mockRestore()
		})
	})

	describe('machine state transitions', () => {
		it('should maintain machine state after init', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			vi.spyOn(machine, 'send').mockImplementation(() => {})

			const initialSnapshot = machine.getSnapshot()
			
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			const postInitSnapshot = machine.getSnapshot()
			expect(postInitSnapshot.status).toBe('active')
			expect(postInitSnapshot.value).toEqual(initialSnapshot.value)
		})

		it('should handle machine status changes', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Test initial state
			expect(machine.getSnapshot().status).toBe('active')

			// Machine should still be active after operations
			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})
			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})
			
			expect(machine.getSnapshot().status).toBe('active')
			mockSend.mockRestore()
		})
	})

	describe('resource cleanup', () => {
		it('should properly dispose of resources when using using syntax multiple times', () => {
			const machines: Actor<typeof clientMachine>[] = []

			for (let i = 0; i < 3; i++) {
				using localFirst = new WorkerLocalFirst()
				const machine = (
					localFirst as unknown as { machine: Actor<typeof clientMachine> }
				).machine
				machines.push(machine)
			}

			// All machines should be stopped after leaving scope
			machines.forEach(machine => {
				expect(machine.getSnapshot().status).toBe('stopped')
			})
		})

		it('should handle disposal when machine is already stopped', () => {
			let machine: Actor<typeof clientMachine>
			{
				using localFirst = new WorkerLocalFirst()
				machine = (
					localFirst as unknown as { machine: Actor<typeof clientMachine> }
				).machine
				
				// Manually stop the machine
				machine.stop()
				expect(machine.getSnapshot().status).toBe('stopped')
			}
			
			// Should remain stopped after disposal
			expect(machine.getSnapshot().status).toBe('stopped')
		})
	})

	describe('init parameter validation', () => {
		it('should handle partial init parameters', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			// Test with only wsUrl
			localFirst.init({ wsUrl: SOCKET_URL } as any)
			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: undefined
			})

			// Test with only dbName
			localFirst.init({ dbName: DB_NAME } as any)
			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: undefined,
				dbName: DB_NAME
			})

			mockSend.mockRestore()
		})

		it('should handle extra parameters in init', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME,
				extraParam: 'should be ignored'
			} as any)

			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			mockSend.mockRestore()
		})

		it('should handle special characters in URL and DB name', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			const specialUrl = 'ws://localhost:8080/path?param=value&other=123'
			const specialDbName = 'db-name_with.special-chars123'

			localFirst.init({
				wsUrl: specialUrl,
				dbName: specialDbName
			})

			expect(mockSend).toHaveBeenCalledWith({
				type: 'init',
				wsUrl: specialUrl,
				dbName: specialDbName
			})

			mockSend.mockRestore()
		})
	})

	describe('concurrent operations', () => {
		it('should handle rapid successive init calls', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			// Rapid successive calls
			for (let i = 0; i < 5; i++) {
				localFirst.init({
					wsUrl: `${SOCKET_URL}/${i}`,
					dbName: `${DB_NAME}_${i}`
				})
			}

			expect(mockSend).toHaveBeenCalledTimes(5)
			
			// Verify last call parameters
			expect(mockSend).toHaveBeenLastCalledWith({
				type: 'init',
				wsUrl: `${SOCKET_URL}/4`,
				dbName: `${DB_NAME}_4`
			})

			mockSend.mockRestore()
		})
	})

	describe('machine state access', () => {
		it('should allow access to machine snapshot', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const snapshot = machine.getSnapshot()
			
			expect(snapshot).toHaveProperty('status')
			expect(snapshot).toHaveProperty('value')
			expect(snapshot.status).toBe('active')
			expect(snapshot.value).toEqual({
				websocket: 'disconnected',
				db: 'disconnected',
				superiority: 'follower'
			})
		})

		it('should reflect consistent state across multiple snapshot calls', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const snapshot1 = machine.getSnapshot()
			const snapshot2 = machine.getSnapshot()

			expect(snapshot1.status).toBe(snapshot2.status)
			expect(snapshot1.value).toEqual(snapshot2.value)
		})
	})

	describe('constructor behavior', () => {
		it('should create a machine in active state on instantiation', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			expect(machine.getSnapshot().status).toBe('active')
		})

		it('should start machine automatically in constructor', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			// Machine should be started automatically
			expect(machine.getSnapshot().status).toBe('active')
		})
	})

	describe('Symbol.dispose implementation', () => {
		it('should implement Symbol.dispose correctly', () => {
			const localFirst = new WorkerLocalFirst()
			
			expect(typeof localFirst[Symbol.dispose]).toBe('function')
		})

		it('should stop machine when dispose is called manually', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			expect(machine.getSnapshot().status).toBe('active')
			
			localFirst[Symbol.dispose]()
			
			expect(machine.getSnapshot().status).toBe('stopped')
		})

		it('should handle multiple dispose calls gracefully', () => {
			const localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			localFirst[Symbol.dispose]()
			expect(machine.getSnapshot().status).toBe('stopped')
			
			// Second dispose call should not throw
			expect(() => localFirst[Symbol.dispose]()).not.toThrow()
			expect(machine.getSnapshot().status).toBe('stopped')
		})
	})

	describe('integration with machine events', () => {
		it('should properly format init event with correct type', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			localFirst.init({
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			})

			const [sentEvent] = mockSend.mock.calls[0]
			expect(sentEvent).toHaveProperty('type', 'init')
			expect(sentEvent).toHaveProperty('wsUrl', SOCKET_URL)
			expect(sentEvent).toHaveProperty('dbName', DB_NAME)

			mockSend.mockRestore()
		})

		it('should preserve parameter types when sending events', () => {
			using localFirst = new WorkerLocalFirst()
			const machine = (
				localFirst as unknown as { machine: Actor<typeof clientMachine> }
			).machine

			const mockSend = vi.spyOn(machine, 'send').mockImplementation(() => {})

			const testUrl = 'wss://test.example.com:9999/socket'
			const testDb = 'test-database-name'

			localFirst.init({
				wsUrl: testUrl,
				dbName: testDb
			})

			const [sentEvent] = mockSend.mock.calls[0]
			expect(typeof sentEvent.wsUrl).toBe('string')
			expect(typeof sentEvent.dbName).toBe('string')
			expect(sentEvent.wsUrl).toBe(testUrl)
			expect(sentEvent.dbName).toBe(testDb)

			mockSend.mockRestore()
		})
	})
