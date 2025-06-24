import { assign, setup } from 'xstate'

export const clientMachine = setup({
	types: {
		context: {} as {
			socket?: WebSocket
			wsUrl?: string
			dbName?: string
		},
		events: {} as
			| { type: 'init'; wsUrl: string; dbName: string }
			| { type: 'connected' }
	},
	actions: {
		establishSocket: assign(({ context, self }) => {
			if (!context.wsUrl) return {}
			const socket = new WebSocket(context.wsUrl)
			socket.onopen = () => self.send({ type: 'connected' })
			return { socket }
		}),
		establishDb: assign(() => ({})),
		initWsUrl: assign(({ event }) => {
			if (event.type !== 'init') /* v8 ignore next */ return {}
			return { wsUrl: event.wsUrl }
		}),
		initDbName: assign(({ event }) => {
			if (event.type !== 'init') /* v8 ignore next */ return {}
			return { dbName: `${event.dbName}.sqlite` }
		})
	}
}).createMachine({
	type: 'parallel',
	states: {
		websocket: {
			initial: 'disconnected',
			states: {
				connected: {},
				disconnected: {
					entry: 'establishSocket',
					on: {
						init: {
							actions: ['initWsUrl', 'establishSocket']
						},
						connected: {
							target: 'connected'
						}
					}
				}
			}
		},
		db: {
			initial: 'disconnected',
			states: {
				disconnected: {
					on: {
						init: {
							actions: ['initDbName']
						}
					}
				},
				'will never connect': {
					type: 'final'
				},
				connected: {
					type: 'final'
				}
			}
		}
	}
})
