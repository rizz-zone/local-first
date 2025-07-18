import { SyncEngineBackend } from '@/durable_object'
import { defs } from './defs'
import type { TestingTransition } from '@ground0/shared'

export class SampleObject extends SyncEngineBackend<TestingTransition> {
	protected override engineDef = defs
	protected override backendHandlers = {}
}
