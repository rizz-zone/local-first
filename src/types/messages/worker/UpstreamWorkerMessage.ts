import type { UpstreamWorkerMessageType } from './UpstreamWorkerMessageType'

export type UpstreamWorkerMessage<T> =
	| {
			type: UpstreamWorkerMessageType.Init
			data: { dbName: string; wsUrl: string }
	  }
	| {
			type: UpstreamWorkerMessageType.Transition
			data: T
	  }
