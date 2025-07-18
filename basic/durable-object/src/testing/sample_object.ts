import { SyncEngineBackend } from '@/durable_object'
import { defs } from './defs'
import type { TestingTransition } from '@ground0/shared'

export class SampleObject extends SyncEngineBackend<TestingTransition> {
	engineDef = defs
}
