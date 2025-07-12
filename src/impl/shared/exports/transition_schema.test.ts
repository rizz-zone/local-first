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

describe('comprehensive edge cases and variations', () => {
	describe('action type variations', () => {
		it('handles string action types', () => {
			const stringActionSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('string_action'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('another_string'),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			
			const result = createTransitionSchema(stringActionSchema)
			expect(result).toBe(stringActionSchema['~standard'])
		})

		it('handles numeric action types', () => {
			const numericActionSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal(1),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal(42),
					impact: z.literal(TransitionImpact.SomethingElse)
				}),
				z.object({
					action: z.literal(-10),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result = createTransitionSchema(numericActionSchema)
			expect(result).toBe(numericActionSchema['~standard'])
		})

		it('handles mixed string and numeric action types', () => {
			const mixedActionSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('init'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal(100),
					impact: z.literal(TransitionImpact.SomethingElse)
				}),
				z.object({
					action: z.literal('cleanup'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result = createTransitionSchema(mixedActionSchema)
			expect(result).toBe(mixedActionSchema['~standard'])
		})
	})

	describe('data field variations', () => {
		it('handles schemas without optional data field', () => {
			const noDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('no_data'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result = createTransitionSchema(noDataSchema)
			expect(result).toBe(noDataSchema['~standard'])
		})

		it('handles schemas with simple data objects', () => {
			const simpleDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('simple_data'),
					impact: z.literal(TransitionImpact.LocalOnly),
					data: z.object({
						message: z.string(),
						count: z.number()
					})
				})
			])
			
			const result = createTransitionSchema(simpleDataSchema)
			expect(result).toBe(simpleDataSchema['~standard'])
		})

		it('handles schemas with complex nested data objects', () => {
			const complexDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('complex_data'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						metadata: z.object({
							timestamp: z.number(),
							source: z.string(),
							tags: z.array(z.string())
						}),
						payload: z.object({
							type: z.enum(['update', 'create', 'delete']),
							content: z.record(z.unknown())
						})
					})
				})
			])
			
			const result = createTransitionSchema(complexDataSchema)
			expect(result).toBe(complexDataSchema['~standard'])
		})

		it('handles schemas with optional data field', () => {
			const optionalDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('optional_data'),
					impact: z.literal(TransitionImpact.LocalOnly),
					data: z.object({
						value: z.string()
					}).optional()
				})
			])
			
			const result = createTransitionSchema(optionalDataSchema)
			expect(result).toBe(optionalDataSchema['~standard'])
		})

		it('handles schemas with empty data objects', () => {
			const emptyDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('empty_data'),
					impact: z.literal(TransitionImpact.LocalOnly),
					data: z.object({})
				})
			])
			
			const result = createTransitionSchema(emptyDataSchema)
			expect(result).toBe(emptyDataSchema['~standard'])
		})
	})

	describe('TransitionImpact enum coverage', () => {
		it('handles all TransitionImpact enum values', () => {
			const allImpactsSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('local_impact'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('something_else_impact'),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			
			const result = createTransitionSchema(allImpactsSchema)
			expect(result).toBe(allImpactsSchema['~standard'])
		})

		it('handles multiple actions with same impact', () => {
			const sameImpactSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('first_local'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('second_local'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('third_local'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result = createTransitionSchema(sameImpactSchema)
			expect(result).toBe(sameImpactSchema['~standard'])
		})
	})

	describe('arktype schema comprehensive tests', () => {
		it('handles arktype with string actions', () => {
			const arktypeStringSchema = type({
				action: '"arktype_string"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			}).or({
				action: '"another_arktype_string"',
				impact: type.enumerated(TransitionImpact.SomethingElse)
			})
			
			const result = createTransitionSchema(arktypeStringSchema)
			expect(result).toEqual(arktypeStringSchema['~standard'])
		})

		it('handles arktype with numeric actions', () => {
			const arktypeNumericSchema = type({
				action: type.enumerated(1),
				impact: type.enumerated(TransitionImpact.LocalOnly)
			}).or({
				action: type.enumerated(999),
				impact: type.enumerated(TransitionImpact.SomethingElse)
			})
			
			const result = createTransitionSchema(arktypeNumericSchema)
			expect(result).toEqual(arktypeNumericSchema['~standard'])
		})

		it('handles arktype with complex data structures', () => {
			const arktypeComplexSchema = type({
				action: '"complex_arktype"',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				data: {
					items: 'string[]',
					metadata: {
						version: 'number',
						config: 'Record<string, unknown>'
					}
				}
			})
			
			const result = createTransitionSchema(arktypeComplexSchema)
			expect(result).toEqual(arktypeComplexSchema['~standard'])
		})

		it('handles arktype with optional fields', () => {
			const arktypeOptionalSchema = type({
				action: '"optional_arktype"',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				'data?': {
					'optional_field?': 'string',
					required_field: 'number'
				}
			})
			
			const result = createTransitionSchema(arktypeOptionalSchema)
			expect(result).toEqual(arktypeOptionalSchema['~standard'])
		})
	})

	describe('large schema variations', () => {
		it('handles schemas with many union branches', () => {
			const manyBranchesSchema = z.discriminatedUnion('action', [
				...Array.from({ length: 15 }, (_, i) => 
					z.object({
						action: z.literal(`action_${i}`),
						impact: z.literal(i % 2 === 0 ? TransitionImpact.LocalOnly : TransitionImpact.SomethingElse),
						...(i % 3 === 0 ? {
							data: z.object({
								index: z.literal(i),
								metadata: z.string()
							})
						} : {})
					})
				)
			])
			
			const result = createTransitionSchema(manyBranchesSchema)
			expect(result).toBe(manyBranchesSchema['~standard'])
		})

		it('handles deeply nested data structures', () => {
			const deepNestedSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('deep_nested'),
					impact: z.literal(TransitionImpact.LocalOnly),
					data: z.object({
						level1: z.object({
							level2: z.object({
								level3: z.object({
									level4: z.object({
										level5: z.object({
											deepValue: z.string(),
											deepArray: z.array(z.object({
												nestedId: z.number(),
												nestedData: z.record(z.string())
											}))
										})
									})
								})
							})
						})
					})
				})
			])
			
			const result = createTransitionSchema(deepNestedSchema)
			expect(result).toBe(deepNestedSchema['~standard'])
		})
	})

	describe('return value validation', () => {
		it('returns exactly the ~standard property', () => {
			const testSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('return_test'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result = createTransitionSchema(testSchema)
			const expected = testSchema['~standard']
			
			expect(result).toBe(expected)
			expect(result === expected).toBe(true) // Reference equality
		})

		it('preserves all properties of the standard schema', () => {
			const testSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('properties_test'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						test: z.boolean()
					})
				})
			])
			
			const result = createTransitionSchema(testSchema)
			const original = testSchema['~standard']
			
			expect(result.vendor).toBe(original.vendor)
			expect(result.version).toBe(original.version)
			expect(Object.keys(result)).toEqual(Object.keys(original))
		})

		it('handles consecutive calls with same schema', () => {
			const schema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('consecutive_test'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			const result1 = createTransitionSchema(schema)
			const result2 = createTransitionSchema(schema)
			
			expect(result1).toBe(result2)
			expect(result1).toBe(schema['~standard'])
			expect(result2).toBe(schema['~standard'])
		})
	})

	describe('TypeScript constraint validation', () => {
		it('(TS) accepts valid transition schema with required fields', () => {
			const validSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('valid'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			// Should compile without errors
			const result = createTransitionSchema(validSchema)
			expect(result).toBeDefined()
		})

		it('(TS) accepts transition schema with optional data', () => {
			const validWithDataSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('valid_with_data'),
					impact: z.literal(TransitionImpact.SomethingElse),
					data: z.object({
						content: z.string()
					})
				})
			])
			
			// Should compile without errors
			const result = createTransitionSchema(validWithDataSchema)
			expect(result).toBeDefined()
		})

		it('(TS) rejects schema with wrong discriminator key', () => {
			const wrongDiscriminatorSchema = z.discriminatedUnion('type', [
				z.object({
					type: z.literal('wrong'),
					impact: z.literal(TransitionImpact.LocalOnly)
				})
			])
			
			// @ts-expect-error Schema uses 'type' instead of 'action' as discriminator
			const result = createTransitionSchema(wrongDiscriminatorSchema)
			expect(result).toBeDefined()
		})

		it('(TS) rejects schema missing impact field', () => {
			const missingImpactSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('missing_impact')
					// impact field is missing
				})
			])
			
			// @ts-expect-error Schema is missing required impact field
			const result = createTransitionSchema(missingImpactSchema)
			expect(result).toBeDefined()
		})

		it('(TS) rejects schema with wrong impact type', () => {
			const wrongImpactSchema = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('wrong_impact'),
					impact: z.literal('not_an_enum_value' as any)
				})
			])
			
			// @ts-expect-error impact should be TransitionImpact enum value
			const result = createTransitionSchema(wrongImpactSchema)
			expect(result).toBeDefined()
		})

		it('(TS) rejects non-discriminated union schemas', () => {
			const nonDiscriminatedSchema = z.union([
				z.object({
					action: z.literal('union1'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('union2'),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			
			// @ts-expect-error Should be discriminated union, not regular union
			const result = createTransitionSchema(nonDiscriminatedSchema)
			expect(result).toBeDefined()
		})
	})
})