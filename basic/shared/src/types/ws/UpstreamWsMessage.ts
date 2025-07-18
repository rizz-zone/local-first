import {
	discriminatedUnion,
	literal,
	object,
	refine,
	string,
	type z
} from 'zod/mini'
import { UpstreamWsMessageAction } from './UpstreamWsMessageAction'
import semverValid from 'semver/functions/valid'

export const UpstreamWsMessageSchema = discriminatedUnion('action', [
	object({
		action: literal(UpstreamWsMessageAction.Init),
		version: string().check(refine(semverValid))
	})
])
export type UpstreamWsMessage = z.infer<typeof UpstreamWsMessageSchema>
export const isUpstreamWsMessage = (obj: unknown): obj is UpstreamWsMessage =>
	UpstreamWsMessageSchema.safeParse(obj).success
