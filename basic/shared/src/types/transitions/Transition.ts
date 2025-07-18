import type { TransitionImpact } from './TransitionImpact'

export type Transition = {
	action: string | number
	impact: TransitionImpact
	data?: object
}
