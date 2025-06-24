import { describe, it, expect } from 'vitest'
import { LocalFirst } from './index'
import type { clientMachine } from './machines/client'
import type { Actor } from 'xstate'

describe('LocalFirst', () => {
	it('should initialize with the correct machine state', () => {
		const localFirst = new LocalFirst()
		const machine = (
			localFirst as unknown as { machine: Actor<typeof clientMachine> }
		).machine

		const snapshot = machine.getSnapshot()
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected'
		})
	})
})
