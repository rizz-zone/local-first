export enum TransitionImpact {
	LocalOnly,
	OptimisticPush
}
export type Transition = {
	action: string | number
	impact: TransitionImpact
	data?: object
}
