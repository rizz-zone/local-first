/// <reference lib="webworker" />

import { NoPortsError, PortDoubleInitError } from '../../../errors'
import type { InstanceData } from '../../../types/common/client/InstanceData'
import type { InstanceKey } from '../../../types/common/client/InstanceKey'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../types/transitions/Transition'
import { WorkerLocalFirst } from './worker_thread'

const ctx = self as unknown as SharedWorkerGlobalScope

class WorkerPort<TransitionSchema extends Transition> {
	private static readonly instances = new Map<InstanceKey, WorkerLocalFirst>()
	private static readonly activeInstanceClients = new Map<InstanceKey, number>()
	private readonly id = crypto.randomUUID()
	private port?: MessagePort
	private instanceKey?: InstanceKey
	private instance?: WorkerLocalFirst

	private timeout? = setTimeout(this[Symbol.dispose], 60000)
	private resetTimeout() {
		clearTimeout(this.timeout)
		this.timeout = setTimeout(this[Symbol.dispose], 60000)
	}

	public init(data: InstanceData) {
		if (this.instanceKey)
			throw new PortDoubleInitError(
				'SharedWorker port was initialized twice! This ' +
					'is a process that happens internally, so ' +
					'this might be a problem with ground0. ' +
					'Report at ' +
					'https://ground0.rizz.zone/report/double-init'
			)

		// We need to set both maps up in order to init this port.
		// Both need an InstanceKey.
		this.instanceKey = `${data.wsUrl}::${data.dbName}`

		// Create the instance if it doesn't exist yet.
		const potentialInstance = (
			this.constructor as typeof WorkerPort
		).instances.get(this.instanceKey)
		if (potentialInstance) this.instance = potentialInstance
		else {
			this.instance = new WorkerLocalFirst()
			this.instance.init(data)
			;(this.constructor as typeof WorkerPort).instances.set(
				this.instanceKey,
				this.instance
			)
		}

		// Bump clients for this instance by 1.
		// This will create the count if it's new.
		const clients = (
			this.constructor as typeof WorkerPort
		).activeInstanceClients.get(this.instanceKey)
		;(this.constructor as typeof WorkerPort).activeInstanceClients.set(
			this.instanceKey,
			(clients ?? 0) + 1
		)
	}

	constructor(port: MessagePort) {
		this.port = port
		this.port.onmessage = (
			event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
		) => {
			const message = event.data
			switch (message.type) {
				case UpstreamWorkerMessageType.Init:
					this.init(message.data)
					break
				case UpstreamWorkerMessageType.Ping:
					this.resetTimeout()
					break
			}
		}
	}

	[Symbol.dispose]() {
		// Static things get changed first.
		// If the instance never got created, we don't need to clean it up.
		if (this.instanceKey) {
			// Decrease activeInstanceClients or delete the instance.
			const clients = (
				this.constructor as typeof WorkerPort
			).activeInstanceClients.get(this.instanceKey)
			if (!clients)
				throw new Error('Instance we tried to disconnect has no clients!')
			if (clients === 1) {
				;(this.constructor as typeof WorkerPort).activeInstanceClients.delete(
					this.instanceKey
				)
				;(this.constructor as typeof WorkerPort).instances.delete(
					this.instanceKey
				)
				return
			}
			;(this.constructor as typeof WorkerPort).activeInstanceClients.set(
				this.instanceKey,
				clients - 1
			)
		}

		this.instance = undefined
		this.instanceKey = undefined
		this.timeout = undefined
		this.port = undefined
	}
}

function init<TransitionSchema extends Transition>() {
	ctx.onconnect = (event) => {
		const port = event.ports[0]
		if (!port)
			throw new NoPortsError('onconnect fired, but there is no associated port')

		new WorkerPort<TransitionSchema>(port)
	}
}

export const portManager = { init }
