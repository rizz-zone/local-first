import { describe, expect, it } from 'vitest'
import {
	NoPortsError,
	PortDoubleInitError,
	WorkerDoubleInitError,
	TestOnlyError,
	AbsentPortDisconnectionError
} from './index'

describe('Custom Error Classes', () => {
	describe('NoPortsError', () => {
		it('should create an instance with correct message', () => {
			const message = 'No ports available'
			const error = new NoPortsError(message)

			expect(error.message).toBe(message)
			expect(error.name).toBe('NoPortsError')
			expect(error).toBeInstanceOf(NoPortsError)
			expect(error).toBeInstanceOf(Error)
		})

		it('should maintain proper prototype chain', () => {
			const error = new NoPortsError('test message')

			expect(Object.getPrototypeOf(error)).toBe(NoPortsError.prototype)
			expect(error.constructor).toBe(NoPortsError)
		})

		it('should be catchable as Error', () => {
			const message = 'Test error message'

			expect(() => {
				throw new NoPortsError(message)
			}).toThrow(Error)

			expect(() => {
				throw new NoPortsError(message)
			}).toThrow(NoPortsError)

			expect(() => {
				throw new NoPortsError(message)
			}).toThrow(message)
		})

		it('should handle empty message', () => {
			const error = new NoPortsError('')

			expect(error.message).toBe('')
			expect(error.name).toBe('NoPortsError')
		})

		it('should handle special characters in message', () => {
			const message = 'Error with special chars: áéíóú 中文 🚀'
			const error = new NoPortsError(message)

			expect(error.message).toBe(message)
		})

		it('should have stack trace', () => {
			const error = new NoPortsError('test')

			expect(error.stack).toBeDefined()
			expect(typeof error.stack).toBe('string')
		})

		it('should work in try-catch blocks', () => {
			const message = 'Port error occurred'
			let caughtError: Error | null = null

			try {
				throw new NoPortsError(message)
			} catch (error) {
				caughtError = error as Error
			}

			expect(caughtError).toBeInstanceOf(NoPortsError)
			expect(caughtError?.message).toBe(message)
		})
	})

	describe('PortDoubleInitError', () => {
		it('should create an instance with correct message', () => {
			const message = 'Port already initialized'
			const error = new PortDoubleInitError(message)

			expect(error.message).toBe(message)
			expect(error.name).toBe('DoublePortInitError')
			expect(error).toBeInstanceOf(PortDoubleInitError)
			expect(error).toBeInstanceOf(Error)
		})

		it('should maintain proper prototype chain', () => {
			const error = new PortDoubleInitError('test message')

			expect(Object.getPrototypeOf(error)).toBe(PortDoubleInitError.prototype)
			expect(error.constructor).toBe(PortDoubleInitError)
		})

		it('should be distinguishable from other custom errors', () => {
			const portError = new PortDoubleInitError('port error')
			const noPortsError = new NoPortsError('no ports error')

			expect(portError).toBeInstanceOf(PortDoubleInitError)
			expect(portError).not.toBeInstanceOf(NoPortsError)
			expect(noPortsError).not.toBeInstanceOf(PortDoubleInitError)
		})

		it('should handle long messages', () => {
			const longMessage = 'A'.repeat(1000)
			const error = new PortDoubleInitError(longMessage)

			expect(error.message).toBe(longMessage)
			expect(error.message.length).toBe(1000)
		})

		it('should preserve instanceof after being thrown', () => {
			let caughtError: unknown = null

			try {
				throw new PortDoubleInitError('double init')
			} catch (error) {
				caughtError = error
			}

			expect(caughtError).toBeInstanceOf(PortDoubleInitError)
			expect(caughtError).toBeInstanceOf(Error)
		})
	})

	describe('WorkerDoubleInitError', () => {
		it('should create an instance with correct message', () => {
			const message = 'Worker already initialized'
			const error = new WorkerDoubleInitError(message)

			expect(error.message).toBe(message)
			expect(error.name).toBe('WorkerDoubleInitError')
			expect(error).toBeInstanceOf(WorkerDoubleInitError)
			expect(error).toBeInstanceOf(Error)
		})

		it('should maintain proper prototype chain', () => {
			const error = new WorkerDoubleInitError('test message')

			expect(Object.getPrototypeOf(error)).toBe(WorkerDoubleInitError.prototype)
			expect(error.constructor).toBe(WorkerDoubleInitError)
		})

		it('should work with instanceof checks in try-catch', () => {
			try {
				throw new WorkerDoubleInitError('worker error')
			} catch (error) {
				expect(error).toBeInstanceOf(WorkerDoubleInitError)
				expect(error).toBeInstanceOf(Error)
				expect((error as WorkerDoubleInitError).name).toBe('WorkerDoubleInitError')
			}
		})

		it('should handle multiline error messages', () => {
			const multilineMessage =
				'Worker initialization failed:\n- Port already in use\n- Cannot start twice'
			const error = new WorkerDoubleInitError(multilineMessage)

			expect(error.message).toBe(multilineMessage)
			expect(error.message.includes('\n')).toBe(true)
		})
	})

	describe('TestOnlyError', () => {
		it('should create an instance with correct message', () => {
			const message = 'This is a test-only error'
			const error = new TestOnlyError(message)

			expect(error.message).toBe(message)
			expect(error.name).toBe('TestOnlyError')
			expect(error).toBeInstanceOf(TestOnlyError)
			expect(error).toBeInstanceOf(Error)
		})

		it('should maintain proper prototype chain', () => {
			const error = new TestOnlyError('test message')

			expect(Object.getPrototypeOf(error)).toBe(TestOnlyError.prototype)
			expect(error.constructor).toBe(TestOnlyError)
		})

		it('should be serializable for logging purposes', () => {
			const message = 'Test error for serialization'
			const error = new TestOnlyError(message)

			const serialized = JSON.stringify({
				name: error.name,
				message: error.message,
				stack: error.stack?.split('\n')[0]
			})

			const parsed = JSON.parse(serialized)
			expect(parsed.name).toBe('TestOnlyError')
			expect(parsed.message).toBe(message)
		})

		it('should handle test scenario messages', () => {
			const testMessages = [
				'Mock failed to initialize',
				'Test fixture setup error',
				'Assertion helper failure'
			]

			testMessages.forEach((message) => {
				const error = new TestOnlyError(message)
				expect(error.message).toBe(message)
				expect(error.name).toBe('TestOnlyError')
			})
		})
	})

	describe('AbsentPortDisconnectionError', () => {
		it('should create an instance with correct message', () => {
			const message = 'Cannot disconnect absent port'
			const error = new AbsentPortDisconnectionError(message)

			expect(error.message).toBe(message)
			expect(error.name).toBe('AbsentPortDisconnectionError')
			expect(error).toBeInstanceOf(AbsentPortDisconnectionError)
			expect(error).toBeInstanceOf(Error)
		})

		it('should maintain proper prototype chain', () => {
			const error = new AbsentPortDisconnectionError('test message')

			expect(Object.getPrototypeOf(error)).toBe(AbsentPortDisconnectionError.prototype)
			expect(error.constructor).toBe(AbsentPortDisconnectionError)
		})

		it('should handle null and undefined messages gracefully', () => {
			// TypeScript should prevent this, but test runtime behavior
			const errorWithNull = new AbsentPortDisconnectionError(null as unknown as string)
			const errorWithUndefined = new AbsentPortDisconnectionError(undefined as unknown as string)

			expect(errorWithNull.name).toBe('AbsentPortDisconnectionError')
			expect(errorWithUndefined.name).toBe('AbsentPortDisconnectionError')
		})

		it('should handle port identification in messages', () => {
			const portId = 'port-123'
			const message = `Cannot disconnect port ${portId}: port does not exist`
			const error = new AbsentPortDisconnectionError(message)

			expect(error.message).toContain(portId)
			expect(error.message).toContain('disconnect')
		})
	})

	describe('Error inheritance and polymorphism', () => {
		it('should allow polymorphic error handling', () => {
			const errors: Error[] = [
				new NoPortsError('no ports'),
				new PortDoubleInitError('double init'),
				new WorkerDoubleInitError('worker double init'),
				new TestOnlyError('test only'),
				new AbsentPortDisconnectionError('absent port')
			]

			errors.forEach((error) => {
				expect(error).toBeInstanceOf(Error)
				expect(typeof error.message).toBe('string')
				expect(typeof error.name).toBe('string')
				expect(error.stack).toBeDefined()
			})
		})

		it('should maintain unique error names', () => {
			const errorNames = [
				new NoPortsError('').name,
				new PortDoubleInitError('').name,
				new WorkerDoubleInitError('').name,
				new TestOnlyError('').name,
				new AbsentPortDisconnectionError('').name
			]

			const uniqueNames = new Set(errorNames)
			expect(uniqueNames.size).toBe(errorNames.length)
		})

		it('should work with error filtering by type', () => {
			const errors = [
				new NoPortsError('no ports'),
				new Error('regular error'),
				new PortDoubleInitError('double init'),
				new TypeError('type error'),
				new WorkerDoubleInitError('worker error')
			]

			const customErrors = errors.filter(
				(error) =>
					error instanceof NoPortsError ||
					error instanceof PortDoubleInitError ||
					error instanceof WorkerDoubleInitError ||
					error instanceof TestOnlyError ||
					error instanceof AbsentPortDisconnectionError
			)

			expect(customErrors).toHaveLength(3)
			expect(customErrors[0]).toBeInstanceOf(NoPortsError)
			expect(customErrors[1]).toBeInstanceOf(PortDoubleInitError)
			expect(customErrors[2]).toBeInstanceOf(WorkerDoubleInitError)
		})

		it('should work with switch statements on error names', () => {
			const errors = [
				new NoPortsError('no ports'),
				new PortDoubleInitError('double init'),
				new WorkerDoubleInitError('worker error')
			]

			const errorTypes: string[] = []

			errors.forEach((error) => {
				switch (error.name) {
					case 'NoPortsError':
						errorTypes.push('ports')
						break
					case 'DoublePortInitError':
						errorTypes.push('port-init')
						break
					case 'WorkerDoubleInitError':
						errorTypes.push('worker-init')
						break
					default:
						errorTypes.push('unknown')
				}
			})

			expect(errorTypes).toEqual(['ports', 'port-init', 'worker-init'])
		})
	})

	describe('Error creation edge cases', () => {
		it('should handle numeric string messages', () => {
			const numericMessage = '12345'
			const error = new NoPortsError(numericMessage)

			expect(error.message).toBe(numericMessage)
		})

		it('should handle boolean-like messages', () => {
			const booleanMessage = 'true'
			const error = new TestOnlyError(booleanMessage)

			expect(error.message).toBe(booleanMessage)
		})

		it('should handle multiline messages', () => {
			const multilineMessage = 'Line 1\nLine 2\nLine 3'
			const error = new WorkerDoubleInitError(multilineMessage)

			expect(error.message).toBe(multilineMessage)
			expect(error.message.split('\n')).toHaveLength(3)
		})

		it('should handle messages with tabs and special whitespace', () => {
			const specialMessage = '\t\r\n  Special\u00A0message  \t'
			const error = new AbsentPortDisconnectionError(specialMessage)

			expect(error.message).toBe(specialMessage)
		})

		it('should handle very long messages', () => {
			const longMessage = 'Very long error message: ' + 'x'.repeat(5000)
			const error = new PortDoubleInitError(longMessage)

			expect(error.message).toBe(longMessage)
			expect(error.message.length).toBeGreaterThan(5000)
		})

		it('should handle unicode and emoji in messages', () => {
			const unicodeMessage = '🚨 港口错误: ポートエラー 🔥'
			const error = new NoPortsError(unicodeMessage)

			expect(error.message).toBe(unicodeMessage)
		})
	})

	describe('Error toString and display behavior', () => {
		it('should have proper toString representation', () => {
			const message = 'Test error message'
			const error = new NoPortsError(message)

			const toString = error.toString()
			expect(toString).toContain('NoPortsError')
			expect(toString).toContain(message)
		})

		it('should work with console.log-like operations', () => {
			const error = new PortDoubleInitError('Console test')

			expect(() => String(error)).not.toThrow()
			expect(String(error)).toContain('DoublePortInitError')
		})

		it('should maintain error display consistency', () => {
			const message = 'Consistent error message'
			const errors = [
				new NoPortsError(message),
				new PortDoubleInitError(message),
				new WorkerDoubleInitError(message),
				new TestOnlyError(message),
				new AbsentPortDisconnectionError(message)
			]

			errors.forEach((error) => {
				const stringified = String(error)
				expect(stringified).toContain(error.name)
				expect(stringified).toContain(message)
			})
		})
	})

	describe('Error integration scenarios', () => {
		it('should work in async/await error handling', async () => {
			const asyncFunction = async (): Promise<never> => {
				throw new WorkerDoubleInitError('Async worker error')
			}

			await expect(asyncFunction()).rejects.toThrow(WorkerDoubleInitError)
			await expect(asyncFunction()).rejects.toThrow('Async worker error')
		})

		it('should work in Promise rejection scenarios', () => {
			const promise = Promise.reject(new PortDoubleInitError('Promise rejection'))
			return expect(promise).rejects.toBeInstanceOf(PortDoubleInitError)
		})

		it('should maintain error context through re-throwing', () => {
			let finalError: Error | null = null

			try {
				throw new NoPortsError('Original error')
			} catch (error) {
				finalError = error as Error
			}

			expect(finalError).toBeInstanceOf(NoPortsError)
			expect(finalError?.message).toBe('Original error')
		})

		it('should work with error aggregation patterns', () => {
			const errors = [
				new NoPortsError('Error 1'),
				new PortDoubleInitError('Error 2'),
				new WorkerDoubleInitError('Error 3')
			]

			const aggregatedMessage = errors.map((e) => e.message).join('; ')
			const aggregatedError = new TestOnlyError(aggregatedMessage)

			expect(aggregatedError.message).toBe('Error 1; Error 2; Error 3')
		})
	})
})