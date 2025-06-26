/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../classes/worker_thread'
import type { BrowserFoundationDataPair } from '../types/common/client/BrowserFoundationDataPair'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../types/transitions/Transition'

const ctx = self as unknown as SharedWorkerGlobalScope

export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	const objectMap = new Map<BrowserFoundationDataPair, WorkerLocalFirst>()
	const portMap = new Map<string, MessagePort>()
	const activeTabsMap = new Map<BrowserFoundationDataPair, number>()

	function handleDisconnect(portId: string) {}

	ctx.onconnect = (event) => {
		const port = event.ports[0]
		if (!port)
			return console.error('onconnect fired, but there is no associated port')

		const portId = crypto.randomUUID()
		portMap.set(portId, port)

		let objectKey: BrowserFoundationDataPair

		port.onmessage = (
			event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
		) => {
			const message = event.data
			switch (message.type) {
				case UpstreamWorkerMessageType.Init: {
					if (objectKey) return

					const { wsUrl, dbName } = message.data
					objectKey = { wsUrl, dbName }

					if (!objectMap.has(objectKey)) {
						using newObject = new WorkerLocalFirst()
						newObject.init(objectKey)
						objectMap.set(objectKey, newObject)
					}

					const existingActiveTabs = activeTabsMap.get(objectKey)
					if (!existingActiveTabs) {
						activeTabsMap.set(objectKey, 1)
						return
					}
					activeTabsMap.set(objectKey, existingActiveTabs + 1)

					return
				}
			}
		}
		port.onmessageerror = (e) => {
			console.error('Port message error on port', portId)
			console.error(e)
		}
	}
}
