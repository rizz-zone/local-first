import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Transition } from '../../../types/transitions/Transition'

export function createTransitionSchema<S extends StandardSchemaV1>(
	schema: StandardSchemaV1.InferInput<S> extends Transition ? S : never
) {
	return schema['~standard']
}
