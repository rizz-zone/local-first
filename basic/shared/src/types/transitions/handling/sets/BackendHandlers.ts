import type { Transition } from '../../Transition'
import type { HandlingFunction } from '../HandlingFunction'
import type { RequiredActionsForImpact } from '../RequiredActionsForImpact'

export type BackendHandlers<T extends Transition> = {
	[K in RequiredActionsForImpact<T, never>]: HandlingFunction<T, K>
}
