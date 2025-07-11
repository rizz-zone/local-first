/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../../classes/worker_thread'
import { NoPortsError } from '../../../../errors'
import type { InstanceData } from '../../../../types/common/client/InstanceData'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../../types/transitions/Transition'

const ctx = self as unknown as SharedWorkerGlobalScope

export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	const objectMap = new Map<string, WorkerLocalFirst>()
	// TODO: Figure out if I actually need a port map
	const portMap = new Map<string, MessagePort>()
	const activeTabsMap = new Map<string, number>()

	// TODO: This will be used in response to things like ping timeouts and errors and stuff
	function handleDisconnect(portId: string, objectKey: InstanceData) {
		portMap.delete(portId)
		const objectKeyString = `${objectKey.wsUrl}::${objectKey.dbName}`
		const activeTabs = activeTabsMap.get(objectKeyString)
		if (!activeTabs) return
		if (activeTabs <= 1) {
			activeTabsMap.delete(objectKeyString)
			objectMap.delete(objectKeyString)
			return
		}
		activeTabsMap.set(objectKeyString, activeTabs - 1)
	}

	ctx.onconnect = (event) => {
		const port = event.ports[0]
		if (!port)
			throw new NoPortsError('onconnect fired, but there is no associated port')

		const portId = crypto.randomUUID()
		portMap.set(portId, port)

		let pingTimeout: ReturnType<typeof setTimeout>
		function resetPingTimeout() {
			if (pingTimeout) clearTimeout(pingTimeout)
			pingTimeout = setTimeout(
				() => {
					handleDisconnect(portId, objectKey)
				},
				// We could use a shorter timeout than 5000, but we want the
				// user to be able to Cmd / Ctrl + Shift + T without it
				// taking ages
				5000
			)
		}
		resetPingTimeout()

		let objectKey: InstanceData

		port.onmessage = (
			event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
		) => {
			const message = event.data
			switch (message.type) {
				case UpstreamWorkerMessageType.Init: {
					if (objectKey) return

					const { wsUrl, dbName } = message.data
					objectKey = { wsUrl, dbName }
					const objectKeyString = `${wsUrl}::${dbName}`

					if (!objectMap.has(objectKeyString)) {
						using newObject = new WorkerLocalFirst()
						newObject.init(objectKey)
						objectMap.set(objectKeyString, newObject)
					}

					const existingActiveTabs = activeTabsMap.get(objectKeyString)
					if (!existingActiveTabs) {
						activeTabsMap.set(objectKeyString, 1)
						return
					}
					activeTabsMap.set(objectKeyString, existingActiveTabs + 1)

					return
				}
				case UpstreamWorkerMessageType.Ping:
					return resetPingTimeout()
			}
		}
		port.onmessageerror = (e) => {
			console.error('Port message error on port', portId)
			console.error(e)
		}
	}
}
