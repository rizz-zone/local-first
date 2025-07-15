import type { Transition } from './transitions/Transition'
import type { TransitionSchema } from './transitions/TransitionSchema'

export type SyncEngineDefinition<T extends Transition> = {
	version: {
		/**
		 * The version of the sync engine that this definition provides. This must be valid in [SemVer format](https://semver.org/) (e.g 1.2.3) and be greater than the `minimum` version.
		 *
		 * You should set this because it will will signal to the Durable Object whether the client is too old. This will help in case you release bad code, or do a large backwards-incompatible refactor of your sync engine.
		 *
		 * On the client side, if you connect to a Durable Object that has a mismatched MAJOR version, `version.onTooOld` will fire.
		 */
		current: string
		/**
		 * Define custom behaviour for when this sync engine is too old to connect to the Durable Object. This replaces the default behaviour of refreshing the tab immediately.
		 */
		onTooOld?: () => unknown
	}
	transitions: {
		/**
		 * The transition schema for this sync enigne.
		 */
		schema: TransitionSchema<T>
		handlers: {
			[K in T['action']]: {
				client: (data: (T & { action: K })['data']) => unknown
			}
		}
	}
}
