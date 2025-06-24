import { createMachine } from 'xstate'

export const clientMachine = createMachine({
	type: 'parallel',
	states: {
		websocket: {
			initial: 'disconnected',
			states: { connected: {}, disconnected: {} }
		},
		db: {
			initial: 'disconnected',
			states: {
				disconnected: {},
				'will never connect': {},
				connected: {}
			}
		}
	}
})
