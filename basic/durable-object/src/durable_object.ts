import { DurableObject } from 'cloudflare:workers'
import {
	UpstreamWsMessageAction,
	type Transition,
	type SyncEngineDefinition,
	isUpstreamWsMessage,
	type UpstreamWsMessage,
	WsCloseCode
} from '@ground0/shared'
import SuperJSON from 'superjson'
import semverMajor from 'semver/functions/major'

export abstract class SyncEngineBackend<
	T extends Transition
> extends DurableObject {
	protected abstract engineDef: SyncEngineDefinition<T>
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
		if (typeof message !== 'string') {
			console.log('Client sent an ArrayBuffer!')
			return ws.close(WsCloseCode.InvalidMessage)
		}
		let decoded: UpstreamWsMessage
		try {
			const potentialObj = SuperJSON.parse(message)
			if (!isUpstreamWsMessage(potentialObj)) throw new Error()
			decoded = potentialObj
		} catch {
			console.log('Client did not send valid JSON!')
			return ws.close(WsCloseCode.InvalidMessage)
		}

		switch (decoded.action) {
			case UpstreamWsMessageAction.Init: {
				if (
					semverMajor(decoded.version) !==
					semverMajor(this.engineDef.version.current)
				)
					return ws.close(WsCloseCode.Incompatible)
				break
			}
		}
	}
}
