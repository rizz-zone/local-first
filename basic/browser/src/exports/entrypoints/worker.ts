/// <reference lib="webworker" />

import { WorkerLocalFirst } from '../../helpers/worker_thread'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../../../src/types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../../../src/types/transitions/Transition'
import { WorkerDoubleInitError } from '../../../../../src/common/errors'
import { workerDoubleInit } from '../../../../../src/common/errors/messages'

let called = false
export function workerEntrypoint<TransitionSchema extends Transition>() {
	if (called) throw new WorkerDoubleInitError(workerDoubleInit(false))
	called = true

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
