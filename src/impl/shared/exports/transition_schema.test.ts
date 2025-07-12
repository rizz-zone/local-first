import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { type } from 'arktype'
import { createTransitionSchema } from './transition_schema'
import { TransitionImpact } from '../../../types/transitions/Transition'

describe('createTransitionSchema', () => {
	describe('Valid Zod Schemas', () => {
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

		it('accepts simple zod object schema with string action', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('accepts simple zod object schema with number action', () => {
			const schema = z.object({
				action: z.number(),
				impact: z.literal(TransitionImpact.SomethingElse)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('accepts zod schema with union action type', () => {
			const schema = z.object({
				action: z.union([z.string(), z.number()]),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('accepts complex nested zod schema with optional data', () => {
			const schema = z.object({
				action: z.literal('complex'),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					required: z.string(),
					optional: z.string().optional(),
					nested: z.object({
						deep: z.array(z.number()),
						metadata: z.record(z.string(), z.unknown())
					}).optional()
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('accepts zod schema with different TransitionImpact values', () => {
			const schema = z.discriminatedUnion('impact', [
				z.object({
					action: z.literal('local'),
					impact: z.literal(TransitionImpact.LocalOnly)
				}),
				z.object({
					action: z.literal('remote'),
					impact: z.literal(TransitionImpact.SomethingElse)
				})
			])
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('accepts zod schema with various data object shapes', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					primitive: z.string(),
					array: z.array(z.number()),
					nested: z.object({
						deep: z.boolean()
					}),
					record: z.record(z.string()),
					optional: z.string().optional()
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})
	})

	describe('Valid ArkType Schemas', () => {
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

		it('accepts simple arktype schema with string action', () => {
			const schema = type({
				action: 'string',
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

		it('accepts simple arktype schema with number action', () => {
			const schema = type({
				action: 'number',
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

		it('accepts arktype schema with union action type', () => {
			const schema = type({
				action: 'string | number',
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

		it('accepts complex arktype schema with optional data', () => {
			const schema = type({
				action: '"complex"',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				'data?': {
					required: 'string',
					'optional?': 'string',
					'nested?': {
						deep: 'number[]',
						metadata: 'Record<string, unknown>'
					}
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

		it('accepts arktype schema with literal and enumerated values', () => {
			const schema = type({
				action: '"literal" | 42',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				'data?': 'object'
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

		it('accepts arktype schema with various data shapes', () => {
			const schema = type({
				action: 'string',
				impact: type.enumerated(TransitionImpact.LocalOnly),
				'data?': {
					primitive: 'string',
					array: 'number[]',
					nested: {
						deep: 'boolean'
					},
					record: 'Record<string, string>',
					'optional?': 'string'
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

	describe('Edge Cases and Boundary Conditions', () => {
		it('handles minimal valid zod schema', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles minimal valid arktype schema', () => {
			const schema = type({
				action: 'string',
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

		it('preserves standard schema properties for zod schemas', () => {
			const schema = z.object({
				action: z.literal('test'),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toBeDefined()
			expect(transitionSchema).toHaveProperty('vendor')
			expect(transitionSchema).toHaveProperty('version')
			expect(typeof transitionSchema.validate).toBe('function')
		})

		it('preserves standard schema properties for arktype schemas', () => {
			const schema = type({
				action: '"test"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toBeDefined()
			expect(transitionSchema).toHaveProperty('vendor')
			expect(transitionSchema).toHaveProperty('version')
			expect(typeof transitionSchema.validate).toBe('function')
		})

		it('handles zod schemas with deeply nested data structures', () => {
			const schema = z.object({
				action: z.literal('nested'),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					level1: z.object({
						level2: z.object({
							level3: z.object({
								deepValue: z.string(),
								deepArray: z.array(z.number())
							})
						})
					})
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('handles arktype schemas with complex type definitions', () => {
			const schema = type({
				action: '"complex"',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				'data?': {
					union: 'string | number | boolean',
					tuple: '[string, number]',
					recursive: 'Record<string, unknown>',
					constraint: 'string.email'
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

	describe('Schema Validation Behavior', () => {
		it('returned schema validates correct zod transition data', () => {
			const schema = z.object({
				action: z.literal('validate'),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					value: z.number()
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			const validData = {
				action: 'validate' as const,
				impact: TransitionImpact.LocalOnly
			}
			const result = transitionSchema.validate(validData)
			expect(result.issues).toBeUndefined()
			expect(result.value).toEqual(validData)
		})

		it('returned schema validates correct zod transition data with optional field', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					value: z.number()
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			const validData = {
				action: 'test',
				impact: TransitionImpact.LocalOnly,
				data: { value: 42 }
			}
			const result = transitionSchema.validate(validData)
			expect(result.issues).toBeUndefined()
			expect(result.value).toEqual(validData)
		})

		it('returned schema rejects invalid zod transition data', () => {
			const schema = z.object({
				action: z.literal('strict'),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			const invalidData = {
				action: 'wrong',
				impact: TransitionImpact.LocalOnly
			}
			const result = transitionSchema.validate(invalidData)
			expect(result.issues).toBeDefined()
			expect(result.issues!.length).toBeGreaterThan(0)
		})

		it('returned schema validates correct arktype transition data', () => {
			const schema = type({
				action: '"validate"',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				'data?': {
					value: 'number'
				}
			})
			const transitionSchema = createTransitionSchema(schema)

			const validData = {
				action: 'validate',
				impact: TransitionImpact.SomethingElse
			}
			const result = transitionSchema.validate(validData)
			expect(result.issues).toBeUndefined()
			expect(result.value).toEqual(validData)
		})

		it('returned schema rejects invalid arktype transition data', () => {
			const schema = type({
				action: '"strict"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			const invalidData = {
				action: 'wrong',
				impact: TransitionImpact.LocalOnly
			}
			const result = transitionSchema.validate(invalidData)
			expect(result.issues).toBeDefined()
			expect(result.issues!.length).toBeGreaterThan(0)
		})

		it('handles validation of complex nested data structures', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					nested: z.object({
						values: z.array(z.number().positive()),
						metadata: z.record(z.string())
					})
				}).optional()
			})
			const transitionSchema = createTransitionSchema(schema)

			const validComplexData = {
				action: 'complex',
				impact: TransitionImpact.LocalOnly,
				data: {
					nested: {
						values: [1, 2, 3],
						metadata: { key: 'value' }
					}
				}
			}
			const result = transitionSchema.validate(validComplexData)
			expect(result.issues).toBeUndefined()
			expect(result.value).toEqual(validComplexData)
		})
	})

	describe('TypeScript Type Safety Tests', () => {
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

		it('(TS) rejects schemas missing required action field', () => {
			const schema = z.object({
				impact: z.literal(TransitionImpact.LocalOnly)
				// Missing action field
			})
			// @ts-expect-error Missing required action field
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) rejects schemas missing required impact field', () => {
			const schema = z.object({
				action: z.literal('test')
				// Missing impact field
			})
			// @ts-expect-error Missing required impact field
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) rejects schemas with invalid action type', () => {
			const schema = z.object({
				action: z.boolean(), // Invalid: should be string or number
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			// @ts-expect-error Invalid action type
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) rejects schemas with invalid impact type', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.string() // Invalid: should be TransitionImpact enum value
			})
			// @ts-expect-error Invalid impact type
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) rejects schemas with invalid data type', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.string() // Invalid: should be object if present
			})
			// @ts-expect-error Invalid data type
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) accepts valid schema with all required fields', () => {
			const schema = z.object({
				action: z.literal('valid'),
				impact: z.literal(TransitionImpact.LocalOnly),
				data: z.object({
					value: z.string()
				}).optional()
			})
			// This should compile without error
			const transitionSchema = createTransitionSchema(schema)

			expect(transitionSchema).toMatchObject(schema['~standard'])
		})

		it('(TS) accepts arktype schema with valid transition structure', () => {
			const schema = type({
				action: 'string | number',
				impact: type.enumerated(TransitionImpact.SomethingElse),
				'data?': 'object'
			})
			// This should compile without error
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

	describe('Standard Schema Interface Compliance', () => {
		it('returns standard schema with required properties for zod', () => {
			const schema = z.object({
				action: z.literal('standard'),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const result = createTransitionSchema(schema)

			expect(result).toBeDefined()
			expect(result).toHaveProperty('vendor')
			expect(result).toHaveProperty('version')
			expect(typeof result.validate).toBe('function')
			expect(result.version).toMatch(/^\d+\.\d+\.\d+$/)
		})

		it('returns standard schema with required properties for arktype', () => {
			const schema = type({
				action: '"standard"',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})
			const result = createTransitionSchema(schema)

			expect(result).toBeDefined()
			expect(result).toHaveProperty('vendor')
			expect(result).toHaveProperty('version')
			expect(typeof result.validate).toBe('function')
			expect(result.version).toMatch(/^\d+\.\d+\.\d+$/)
		})

		it('preserves schema vendor information', () => {
			const zodSchema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const arktypeSchema = type({
				action: 'string',
				impact: type.enumerated(TransitionImpact.LocalOnly)
			})

			const zodResult = createTransitionSchema(zodSchema)
			const arktypeResult = createTransitionSchema(arktypeSchema)

			expect(zodResult.vendor).toBe('zod')
			expect(arktypeResult.vendor).toBe('arktype')
		})

		it('maintains consistent validate function interface', () => {
			const schema = z.object({
				action: z.string(),
				impact: z.literal(TransitionImpact.LocalOnly)
			})
			const transitionSchema = createTransitionSchema(schema)

			const testData = { action: 'test', impact: TransitionImpact.LocalOnly }
			const result = transitionSchema.validate(testData)

			expect(result).toHaveProperty('value')
			expect(typeof result.issues).toBe('undefined')
			expect(result.value).toEqual(testData)
		})
	})
})
