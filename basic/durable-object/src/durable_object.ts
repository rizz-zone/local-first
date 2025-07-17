/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers'
import type { Transition, SyncEngineDefinition } from '@ground0/shared'

export class SyncEngineBackend<T extends Transition> extends DurableObject {
	private engineDef: SyncEngineDefinition<T>
	private checkFetch?: (request: Request) => boolean

	override async fetch(request: Request) {
		if (this.checkFetch && !this.checkFetch(request))
			return new Response('Unauthorized', { status: 401 })

		// Create two ends of a WebSocket connection
		const webSocketPair = new WebSocketPair()
		const [client, server] = Object.values(webSocketPair)
		if (!server) return new Response(null, { status: 500 })

		// Accept the server one
		this.ctx.acceptWebSocket(server)

		return new Response(null, {
			status: 101,
			webSocket: client
		})
	}

	override async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer
	) {
		// Upon receiving a message from the client, reply with the same message,
		// but will prefix the message with "[Durable Object]: " and return the
		// total number of connections.
		ws.send(
			`[Durable Object] message: ${message}, connections: ${this.ctx.getWebSockets().length}`
		)
	}
}
