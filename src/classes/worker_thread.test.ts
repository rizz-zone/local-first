import { describe, it, expect } from 'vitest'
import { WorkerLocalFirst } from './worker_thread'
import type { clientMachine } from '../machines/worker'
import type { Actor } from 'xstate'

describe('WorkerLocalFirst', () => {
	it('should initialise with the correct machine state', () => {
		using localFirst = new WorkerLocalFirst()
		const machine = (
			localFirst as unknown as { machine: Actor<typeof clientMachine> }
		).machine

		const snapshot = machine.getSnapshot()
		expect(snapshot.status).toEqual('active')
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected'
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
