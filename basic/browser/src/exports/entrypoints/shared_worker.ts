/// <reference lib="webworker" />

import { WorkerDoubleInitError } from '../../../../shared/src/errors'
import { workerDoubleInit } from '../../../../shared/src/errors/messages'
import type { Transition } from '../../../../../src/types/transitions/Transition'
import { portManager } from '../../helpers/port_manager'

let called = false
export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	if (called) throw new WorkerDoubleInitError(workerDoubleInit(true))
	called = true
	portManager.init<TransitionSchema>()
}
