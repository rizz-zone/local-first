/// <reference lib="webworker" />

import { WorkerDoubleInitError } from '../../../../common/errors'
import { workerDoubleInit } from '../../../../common/errors/messages'
import type { Transition } from '../../../../types/transitions/Transition'
import { portManager } from '../../helpers/port_manager'

let called = false
export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	if (called) throw new WorkerDoubleInitError(workerDoubleInit(true))
	called = true
	portManager.init<TransitionSchema>()
}
