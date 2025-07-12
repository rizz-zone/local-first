import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { type } from 'arktype'
import { createTransitionSchema } from './transition_schema'
import { TransitionImpact } from '../../../types/transitions/Transition'

describe('createTransitionSchema', () => {
	it('accepts a regular zod transition schema', () => {
		const schema = z.discriminatedUnion('action', [
			z.object({
				action: z.literal('init'),
				impact: z.literal(TransitionImpact.LocalOnly)
			}),
			z.object({
				action: z.literal(3),
				impact: z.literal(TransitionImpact.SomethingElse),
				data: z.object({
					foo: z.string(),
					bar: z.number()
				})
			})
		])
		const transitionSchema = createTransitionSchema(schema)

		expect(transitionSchema).toMatchObject(schema['~standard'])
	})
	it('accepts a regular arktype transition schema', () => {
		const schema = type({
			action: '"init"',
			impact: type.enumerated(TransitionImpact.LocalOnly)
		}).or({
			action: type.enumerated(3),
			impact: type.enumerated(TransitionImpact.SomethingElse),
			data: {
				foo: 'string',
				bar: 'number'
			}
		})
		const transitionSchema = createTransitionSchema(schema)

		expect({
			vendor: transitionSchema.vendor,
			version: transitionSchema.version
		}).toMatchObject({
			vendor: schema['~standard'].vendor,
			version: schema['~standard'].version
		})
	})

	// Type tests - these won't fail in vitest if the corresponding 'accepts' tests didn't
	it('(TS) rejects an invalid zod transition schema', () => {
		const schema = z.object({
			action: z.object({
				definitelyInvalid: z.literal('1')
			})
		})
		// @ts-expect-error This is a test to see if TS *won't* accept a bad schema.
		const transitionSchema = createTransitionSchema(schema)

		expect(transitionSchema).toMatchObject(schema['~standard'])
	})
	it('(TS) rejects an invalid arktype transition schema', () => {
		const schema = type({
			action: {
				definitelyInvalid: '"1"'
			}
		})
		// @ts-expect-error This is a test to see if TS *won't* accept a bad schema.
		const transitionSchema = createTransitionSchema(schema)

		expect({
			vendor: transitionSchema.vendor,
			version: transitionSchema.version
		}).toMatchObject({
			vendor: schema['~standard'].vendor,
			version: schema['~standard'].version
		})
	})
})

	describe('complex schema validation', () => {
		it('handles zod schemas with multiple transition types', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('init'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('update'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						id: z.string(),
						value: z.number().min(0)
					})
				}),
				z.object({
					action: z.literal('delete'),
					impact: z.literal(TransitionImpact.LocalOnly),
					metadata: z.record(z.string(), z.any()).optional()
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with complex nested structures', () => {
			const schema = type({
				action: '"complex"',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				data: {
					nested: {
						deep: {
							value: 'string',
							count: 'number'
						}
					},
					array: 'string[]',
					optional: 'string?'
				}
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})

		it('handles zod schemas with optional fields', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('optional-test'),
					impact: z.literal(TransitionImpact.LocalOnly),
					data: z.object({
						required: z.string(),
						optional: z.string().optional(),
						nullable: z.number().nullable()
					}).optional()
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with union types', () => {
			const schema = type({
				action: '"union-test"',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				data: {
					value: 'string | number | boolean'
				}
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})
	})

	describe('edge cases and schema variations', () => {
		it('handles zod schemas with strict object validation', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('strict'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}).strict()
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles zod schemas with refinements', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('refined'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						value: z.number()
					}).refine(data => data.value > 0, {
						message: "Value must be positive"
					})
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with constraints', () => {
			const schema = type({
				action: '"constrained"',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				data: {
					email: 'string.email',
					age: 'number>=0<=120'
				}
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})

		it('handles single action zod schemas (non-discriminated union)', () => {
			const schema = z.object({
				action: z.literal('single'),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles single action arktype schemas (non-union)', () => {
			const schema = type({
				action: '"single"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})
	})

	describe('schema property validation', () => {
		it('preserves all standard properties for zod schemas', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('preserve-test'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			// Verify that the transition schema has the same standard properties
			expect(transitionSchema).toHaveProperty('vendor')
			expect(transitionSchema).toHaveProperty('version')
			expect(transitionSchema.vendor).toBe(schema['~standard'].vendor)
			expect(transitionSchema.version).toBe(schema['~standard'].version)
		})

		it('preserves all standard properties for arktype schemas', () => {
			const schema = type({
				action: '"preserve-test"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			// Verify that the transition schema has the same standard properties
			expect(transitionSchema).toHaveProperty('vendor')
			expect(transitionSchema).toHaveProperty('version')
			expect(transitionSchema.vendor).toBe(schema['~standard'].vendor)
			expect(transitionSchema.version).toBe(schema['~standard'].version)
		})

		it('returns an object with expected structure for zod schemas', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('structure-test'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(typeof transitionSchema).toBe('object')
			expect(transitionSchema).not.toBeNull()
			expect(transitionSchema).not.toBeUndefined()
		})

		it('returns an object with expected structure for arktype schemas', () => {
			const schema = type({
				action: '"structure-test"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(typeof transitionSchema).toBe('object')
			expect(transitionSchema).not.toBeNull()
			expect(transitionSchema).not.toBeUndefined()
		})
	})

	describe('transition impact variations', () => {
		it('handles zod schemas with mixed impact types', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('local'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('something'),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with mixed impact types', () => {
			const schema = type({
				action: '"local"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			}).or({
				action: '"something"',
				impact: type.enumerated(TransitionImpact.SomethingElse)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})
	})

	describe('action type variations', () => {
		it('handles zod schemas with numeric actions', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal(1),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal(2),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with numeric actions', () => {
			const schema = type({
				action: type.enumerated(1),
				impact: type.enumerated(TransitionImpact.LocalOnly)
			}).or({
				action: type.enumerated(2),
				impact: type.enumerated(TransitionImpact.SomethingElse)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})

		it('handles zod schemas with mixed action types', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('string-action'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal(42),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with mixed action types', () => {
			const schema = type({
				action: '"string-action"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			}).or({
				action: type.enumerated(42),
				impact: type.enumerated(TransitionImpact.SomethingElse)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})
	})

	describe('data field variations', () => {
		it('handles zod schemas with complex data objects', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('complex-data'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						array: z.array(z.string()),
						nested: z.object({
							prop1: z.string(),
							prop2: z.number().optional()
						}),
						union: z.union([z.string(), z.number(), z.boolean()])
					})
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with array and tuple data', () => {
			const schema = type({
				action: '"array-data"',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				data: {
					stringArray: 'string[]',
					numberTuple: '[number, number]',
					mixedArray: '(string | number)[]'
				}
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})

		it('handles zod schemas without data field', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('no-data'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas without data field', () => {
			const schema = type({
				action: '"no-data"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect({
				vendor: transitionSchema.vendor,
				version: transitionSchema.version
			}).toMatchObject({
				vendor: schema['~standard'].vendor,
				version: schema['~standard'].version
			})
		})
	})
