/// <reference lib="webworker" />

import type { Transition } from '../../../../types/transitions/Transition'
import { portManager } from '../../helpers/port_manager'

export function sharedWorkerEntrypoint<TransitionSchema extends Transition>() {
	portManager.init<TransitionSchema>()
}
