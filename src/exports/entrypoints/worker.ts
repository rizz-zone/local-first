/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../../classes/worker_thread'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../types/transitions/Transition'

export function workerEntrypoint<TransitionSchema extends Transition>() {
	const ourObject = new WorkerLocalFirst()

	const onmessage = (
		event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
	) => {
		const message = event.data
		switch (message.type) {
			case UpstreamWorkerMessageType.Init: {
				const { wsUrl, dbName } = message.data
				ourObject.init()
			}
		}
	}
}
