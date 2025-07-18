import {
	testingTransitionSchema,
	type SyncEngineDefinition,
	type TestingTransition
} from '@ground0/shared'

export const defs: SyncEngineDefinition<TestingTransition> = {
	version: {
		current: '1.0.0'
	},
	transitions: {
		schema: testingTransitionSchema,
		sharedHandlers: {
			3: () => {}
		}
	}
}
