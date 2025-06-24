import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest'
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

	describe('worker machine sockets', () => {
		let WebSocketOriginal: typeof WebSocket
		let WebSocketMock: typeof WebSocket
		beforeAll(() => {
			WebSocketOriginal = globalThis.WebSocket
		})
		beforeEach(() => {
			WebSocketMock = vi.fn() as unknown as typeof WebSocket
			globalThis.WebSocket = WebSocketMock
		})
		afterAll(() => {
			globalThis.WebSocket = WebSocketOriginal
		})

		it('does not set a websocket up before init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			const { context } = machine.getSnapshot()

			expect(WebSocketMock).toHaveBeenCalledTimes(0)
			expect(context.socket).toBeUndefined()
			expect(context.wsUrl).toBeUndefined()
		})
		it('sets a websocket up after init', () => {
			const machine = createActor(clientMachine)
			machine.start()
			machine.send({
				type: 'init',
				wsUrl: 'ws://localhost/sync',
				dbName: 'jerry'
			})
			const { context } = machine.getSnapshot()

			expect(WebSocketMock).toHaveBeenCalledExactlyOnceWith(
				'ws://localhost/sync'
			)
			expect(context.socket).toBeInstanceOf(WebSocket)
			expect(context.wsUrl).toBe('ws://localhost/sync')
		})
	})
})
