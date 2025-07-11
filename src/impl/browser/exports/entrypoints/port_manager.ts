/// <reference lib="webworker" />

import { NoPortsError, PortDoubleInitError } from '../../../../errors'
import type { InstanceKey } from '../../../../types/common/client/InstanceKey'
import type { UUID } from '../../../../types/common/UUID'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../../types/transitions/Transition'
import { WorkerLocalFirst } from '../../classes/worker_thread'

const ctx = self as unknown as SharedWorkerGlobalScope

// Each instance has a unique combination of URL + DB name.
// If multiple tabs want the same combination, they won't be assigned different instances.
const instances = new Map<InstanceKey, WorkerLocalFirst>()
const activeInstanceClients = new Map<InstanceKey, number>()
const ports = new Map<UUID, MessagePort>()

function init<TransitionSchema extends Transition>() {
	ctx.onconnect = (event) => {
		const port = event.ports[0]
		if (!port)
			throw new NoPortsError('onconnect fired, but there is no associated port')

		// Pings happen between the main thread and the worker. If a ping is missed
		// (the interval is 60s, so this is unlikely), we disconnect the port.
		let pingTimeout: ReturnType<typeof setTimeout>
		function resetPingTimeout() {
			if (pingTimeout) clearTimeout(pingTimeout)
			pingTimeout = setTimeout(
				() => {
					handleDisconnect(portId, objectKey)
				},
				// We could use a shorter timeout, but we want the user
				// to be able to Cmd / Ctrl + Shift + T cleanly.
				60 * 1000
			)
		}
		resetPingTimeout()

		const portId = crypto.randomUUID()
		ports.set(portId, port)

		let instanceKey: InstanceKey
		let instance: WorkerLocalFirst

		port.onmessage = (
			event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
		) => {
			const message = event.data
			switch (message.type) {
				case UpstreamWorkerMessageType.Init: {
					// If our instanceKey is set, this is a double init.
					if (instanceKey)
						throw new PortDoubleInitError(
							'SharedWorker port was initialized twice! This ' +
								'is a process that happens internally, so ' +
								'this might be a problem with ground0. ' +
								'Report at ' +
								'https://ground0.rizz.zone/report/double-init'
						)

					// We need to set both maps up in order to init this port.
					// Both need an InstanceKey.
					instanceKey = `${message.data.wsUrl}::${message.data.dbName}`

					// Create the instance if it doesn't exist yet.
					const potentialInstance = instances.get(instanceKey)
					if (potentialInstance) instance = potentialInstance
					else {
						instance = new WorkerLocalFirst()
						instance.init(message.data)
						instances.set(instanceKey, instance)
					}

					// Bump clients for this instance by 1.
					// This will create the count if it's new.
					const clients = activeInstanceClients.get(instanceKey)
					activeInstanceClients.set(instanceKey, (clients ?? 0) + 1)

					break
				}
			}
		}
	}
}

export default { init }
