import { DurableObject } from 'cloudflare:workers'
import {
	UpstreamWsMessageAction,
	type Transition,
	type SyncEngineDefinition,
	isUpstreamWsMessage,
	type UpstreamWsMessage,
	WsCloseCode,
	type BackendHandlers
} from '@ground0/shared'
import SuperJSON from 'superjson'
import semverMajor from 'semver/functions/major'
import {
	drizzle,
	type DrizzleSqliteDODatabase
} from 'drizzle-orm/durable-sqlite'
import { migrate } from 'drizzle-orm/durable-sqlite/migrator'

export abstract class SyncEngineBackend<
	T extends Transition
> extends DurableObject {
	// All handlers are defined here, since engineDef has engineDef.transitions.sharedHandlers

	/**
	 * The `SyncEngineDefinition` that is shared between the client and the server.
	 */
	protected abstract engineDef: SyncEngineDefinition<T>
	/**
	 * `BackendHandlers` for transitions that run code specific to the Durable Object.
	 */
	protected abstract backendHandlers: BackendHandlers<T>
	/**
	 * A function to:
	 *
	 * 1. Check whether a request should be allowed, on the worker invoked by the request
	 * 2. If the request should be allowed, provide the ID of the Durable Object instance that should be created or used.
	 *
	 * By default, `preCheckFetch` acts based off the `engine_name` query param. If it is not set, it returns `400 Bad Request`, and if it is, it returns the value of this param (which means that that the specific instance of the Durable Object used will have that ID).`
	 *
	 * @param request The request that comes into the Worker
	 * @returns A string for the ID of the Durable Object instance if the request is allowed to continue, or a response if it is rejected
	 */
	protected static preCheckFetch: (request: Request) => string | Response = (
		request
	) => {
		const engineName = new URL(request.url).searchParams.get('engine_name')
		if (!engineName)
			return new Response(
				'Request does not contain engine_name param. Did you forget to override preCheckFetch? https://ground0.rizz.zone/something', // TODO: Fill this URL when the docs are made
				{ status: 400 }
			)
		return engineName
	}
	/**
	 * An optional function to check a request *on the Durable Object instance*. Generally, you should avoid this and override `preCheckFetch` instead, as this shortens response time for requests that fail as well as ensuring that you do not get billed for storage. However, you might need it if part of your criteria for whether a request should be rejected is based off something you store inside of the Durable Object's database.
	 *
	 * In most apps, you should only set this if `preCheckFetch` is already set, as `preCheckFetch` also decides on the ID of the Durable Object instance, and the default behaviour of always creating an instance with the same ID as the `engine_name` query parameter is usually undesirable.
	 *
	 * @returns A `Response` if the request should be blocked and not allowed to upgrade to a websocket, or `undefined` if the request can continue.
	 */
	protected checkFetch?: (request: Request) => Response | undefined

	private db: DrizzleSqliteDODatabase<Record<string, unknown>>

	constructor(ctx: DurableObjectState, env: object) {
		super(ctx, env)
		this.db = drizzle(ctx.storage, { logger: false })

		// This allows us to respond to client pings.
		if (!this.ctx.getWebSocketAutoResponse())
			this.ctx.setWebSocketAutoResponse({
				request: '?',
				response: '!'
			})

		ctx.blockConcurrencyWhile(() => migrate(this.db, this.engineDef.db.schema))
	}

	override async fetch(request: Request) {
		if (this.checkFetch) {
			const potentialResponse = this.checkFetch(request)
			if (potentialResponse) return potentialResponse
		}

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
