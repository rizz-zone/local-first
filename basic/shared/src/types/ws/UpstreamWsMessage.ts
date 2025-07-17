import { discriminatedUnion, literal, object, refine, string } from 'zod/mini'
import { UpstreamWsMessageAction } from './UpstreamWsMessageAction'
import semverValid from 'semver/functions/valid'

export const UpstreamWorkerMessageSchema = discriminatedUnion('action', [
	object({
		action: literal(UpstreamWsMessageAction.Init),
		version: string().check(refine(semverValid))
	})
])
