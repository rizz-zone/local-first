export enum TransitionImpact {
	LocalOnly,
	SomethingElse
}
export type Transition = {
	action: string | number
	impact: TransitionImpact
	data?: object
}
