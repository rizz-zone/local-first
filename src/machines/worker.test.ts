import { describe, expect, it } from 'vitest'
import { clientMachine } from './worker'
import { createActor } from 'xstate'

describe('worker machine', () => {
	it('starts with no connections', () => {
		const machine = createActor(clientMachine)
		machine.start()

		const snapshot = machine.getSnapshot()
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected'
		})
	})
})
