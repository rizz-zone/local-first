/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../../classes/worker_thread'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../../types/transitions/Transition'

// TODO: LOCKING (selection of a leader using navigator.locks, routing transitions to that leader)
export function workerEntrypoint<TransitionSchema extends Transition>() {
	const ourObject = new WorkerLocalFirst()

	onmessage = (
		event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
	) => {
		const message = event.data
		switch (message.type) {
			case UpstreamWorkerMessageType.Init: {
				const { wsUrl, dbName } = message.data
				ourObject.init({ wsUrl, dbName })
				return
			}
			case UpstreamWorkerMessageType.Ping: {
				console.error(
					"main thread tried to ping worker even though it isn't a SharedWorker!"
				)
				return
			}
		}
	}
	onmessageerror = (e) => {
		console.error('Message error!')
		console.error(e)
	}
}
