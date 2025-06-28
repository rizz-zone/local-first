/// <reference lib="webworker" />

import type { Transition } from '../../types/transitions/Transition'

export function workerEntrypoint<TransitionSchema extends Transition>() {
	onmessage = (event: MessageEvent<TransitionSchema>) => {}
}
