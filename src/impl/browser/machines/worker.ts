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
			| { type: 'ws connected' }
			| { type: 'ws connection issue' }
			| { type: 'db connected' }
			| { type: 'db cannot connect' }
			| { type: 'leader lock acquired' }
	},
	actions: {
		establishSocket: assign(({ context, self }) => {
			if (!context.wsUrl) return {}
			const socket = new WebSocket(context.wsUrl)
			socket.onopen = () => self.send({ type: 'ws connected' })
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
		}),
		requestLock: ({ self }) =>
			navigator.locks.request(
				'leader',
				() => new Promise(() => self.send({ type: 'leader lock acquired' }))
			)
	}
}).createMachine({
	type: 'parallel',
	states: {
		websocket: {
			initial: 'disconnected',
			states: {
				connected: {
					on: {
						'ws connection issue': {
							target: 'disconnected'
						}
					}
				},
				disconnected: {
					entry: 'establishSocket',
					on: {
						init: {
							actions: ['initWsUrl', 'establishSocket']
						},
						'ws connected': {
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
						},
						'db connected': {
							target: 'connected'
						},
						'db cannot connect': {
							target: 'will never connect'
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
		},
		superiority: {
			initial: 'follower',
			states: {
				follower: {
					on: {
						'leader lock acquired': {
							target: 'leader'
						},
						init: {
							actions: ['requestLock']
						}
					}
				},
				leader: {}
			}
		}
	}
})
