/// <reference lib="webworker" />

import { WorkerDoubleInitError } from '../../../../../src/common/errors'
import { workerDoubleInit } from '../../../../../src/common/errors/messages'
import type { Transition } from '../../../../../src/types/transitions/Transition'
import { portManager } from '../../helpers/port_manager'

let called = false
export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	if (called) throw new WorkerDoubleInitError(workerDoubleInit(true))
	called = true
	portManager.init<TransitionSchema>()
}
