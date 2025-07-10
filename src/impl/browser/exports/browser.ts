import {
	type UpstreamWorkerMessage,
	UpstreamWorkerMessageType
} from '../../../types/messages/worker/UpstreamWorkerMessage'
import type { Transition } from '../../../types/transitions/Transition'

export class BrowserLocalFirst<TransitionSchema extends Transition> {
	private readonly worker: Worker | SharedWorker
	private submitWorkerMessage(
		message: UpstreamWorkerMessage<TransitionSchema>
	) {
		if ('port' in this.worker) {
			this.worker.port.postMessage(message)
			return
		}
		this.worker.postMessage(message)
	}

	constructor({
		dbName,
		wsUrl,
		worker
	}: {
		dbName: string
		wsUrl: string
		worker: Worker | SharedWorker
	}) {
		this.worker = worker // The user or adapter **must** define this because the way workers are invoked is not standardised
		this.submitWorkerMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { dbName, wsUrl }
		})
	}
	public transition(transition: TransitionSchema) {
		this.submitWorkerMessage({
			type: UpstreamWorkerMessageType.Transition,
			data: transition
		})
	}
}
