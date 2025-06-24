import { describe, it, expect } from 'vitest'
import { LocalFirst } from './index'

// Helper to access private properties for testing
function getMachine(instance: unknown) {
	return (instance as { machine: unknown }).machine
}

describe('LocalFirst', () => {
	it('should initialize with the correct machine state', () => {
		const localFirst = new LocalFirst()
		const machine = getMachine(localFirst) as {
			start: () => void
			getSnapshot: () => { value: unknown }
		}
		// The machine must be started to get a snapshot
		machine.start()
		const snapshot = machine.getSnapshot()
		expect(snapshot.value).toEqual({
			websocket: 'disconnected',
			db: 'disconnected'
		})
	})
})
