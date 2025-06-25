/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../classes/worker_thread'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../types/transitions/Transition'

const ctx = self as unknown as SharedWorkerGlobalScope

export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	using ourLocalFirst = new WorkerLocalFirst()

	ctx.onconnect = (
		event: MessageEvent<UpstreamWorkerMessage<TransitionSchema>>
	) => {
		const message = event.data
		switch (message.type) {
			case UpstreamWorkerMessageType.Init: {
				ourLocalFirst.init()
			}
		}
	}
}
