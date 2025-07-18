import type { Transition } from '../Transition'

export type HandlingFunction<T extends Transition, K> = (
	data: (T & { action: K })['data']
) => unknown
