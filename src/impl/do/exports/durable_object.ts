/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers'
import type { Transition } from '../../../types/transitions/Transition'
import type { SyncEngineDefinition } from '../../shared/exports/engine'

export function createDurableObject<T extends Transition>(
	engineDef: SyncEngineDefinition<T>
) {
	// 'Anonymous' classes like this can't have TypeScript private properties
	// for some reason. We have to simply accept and deal with this.
	return class extends DurableObject {
		constructor(ctx: DurableObjectState, env: Env) {
			super(ctx, env)
		}
	}
}
