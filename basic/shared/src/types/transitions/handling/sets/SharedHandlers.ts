import type { Transition } from '../../Transition'
import type { TransitionImpact } from '../../TransitionImpact'
import type { HandlingFunction } from '../HandlingFunction'
import type { RequiredActionsForImpact } from '../RequiredActionsForImpact'

export type SharedHandlers<T extends Transition> = {
	[K in RequiredActionsForImpact<
		T,
		TransitionImpact.OptimisticPush
	>]: HandlingFunction<T, K>
}
