import { beforeEach, describe, expect, it } from 'vitest'
import {
  NoPortsError,
  PortDoubleInitError,
  WorkerDoubleInitError,
  TestOnlyError,
  AbsentPortDisconnectionError
} from './index'

describe('Error Classes', () => {
  describe('NoPortsError', () => {
    it('should create a NoPortsError with correct name and message', () => {
      const message = 'No ports available for connection'
      const error = new NoPortsError(message)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(NoPortsError)
      expect(error.name).toBe('NoPortsError')
      expect(error.message).toBe(message)
      expect(error.stack).toBeDefined()
    })

    it('should handle empty message', () => {
      const error = new NoPortsError('')
      
      expect(error.name).toBe('NoPortsError')
      expect(error.message).toBe('')
    })

    it('should handle special characters in message', () => {
      const message = 'No ports: 特殊字符 & symbols 🚫'
      const error = new NoPortsError(message)
      
      expect(error.message).toBe(message)
    })

    it('should maintain correct prototype chain', () => {
      const error = new NoPortsError('test')
      
      expect(Object.getPrototypeOf(error)).toBe(NoPortsError.prototype)
      expect(error instanceof NoPortsError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should be serializable to JSON', () => {
      const message = 'No ports available'
      const error = new NoPortsError(message)
      
      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)
      
      expect(parsed.name).toBe('NoPortsError')
      expect(parsed.message).toBe(message)
    })
  })

  describe('PortDoubleInitError', () => {
    it('should create a PortDoubleInitError with correct name and message', () => {
      const message = 'Port has already been initialized'
      const error = new PortDoubleInitError(message)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(PortDoubleInitError)
      expect(error.name).toBe('DoublePortInitError')
      expect(error.message).toBe(message)
      expect(error.stack).toBeDefined()
    })

    it('should handle empty message', () => {
      const error = new PortDoubleInitError('')
      
      expect(error.name).toBe('DoublePortInitError')
      expect(error.message).toBe('')
    })

    it('should handle long messages', () => {
      const longMessage = 'Port initialization error: ' + 'a'.repeat(1000)
      const error = new PortDoubleInitError(longMessage)
      
      expect(error.message).toBe(longMessage)
      expect(error.message.length).toBe(1027)
    })

    it('should maintain correct prototype chain', () => {
      const error = new PortDoubleInitError('test')
      
      expect(Object.getPrototypeOf(error)).toBe(PortDoubleInitError.prototype)
      expect(error instanceof PortDoubleInitError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should preserve stack trace', () => {
      function throwError() {
        throw new PortDoubleInitError('Double init detected')
      }

      expect(() => throwError()).toThrow(PortDoubleInitError)
      
      try {
        throwError()
      } catch (error) {
        if (error instanceof PortDoubleInitError) {
          expect(error.stack).toContain('throwError')
        }
      }
    })
  })

  describe('WorkerDoubleInitError', () => {
    it('should create a WorkerDoubleInitError with correct name and message', () => {
      const message = 'Worker has already been initialized'
      const error = new WorkerDoubleInitError(message)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(WorkerDoubleInitError)
      expect(error.name).toBe('WorkerDoubleInitError')
      expect(error.message).toBe(message)
      expect(error.stack).toBeDefined()
    })

    it('should handle multiline messages', () => {
      const message = 'Worker double initialization:\nLine 1\nLine 2'
      const error = new WorkerDoubleInitError(message)
      
      expect(error.message).toBe(message)
      expect(error.message).toContain('\n')
    })

    it('should handle Unicode characters', () => {
      const message = 'Worker error: 初期化エラー'
      const error = new WorkerDoubleInitError(message)
      
      expect(error.message).toBe(message)
    })

    it('should maintain correct prototype chain', () => {
      const error = new WorkerDoubleInitError('test')
      
      expect(Object.getPrototypeOf(error)).toBe(WorkerDoubleInitError.prototype)
      expect(error instanceof WorkerDoubleInitError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should be distinguishable from other error types', () => {
      const workerError = new WorkerDoubleInitError('worker error')
      const portError = new PortDoubleInitError('port error')
      
      expect(workerError.name).toBe('WorkerDoubleInitError')
      expect(portError.name).toBe('DoublePortInitError')
      expect(workerError.name).not.toBe(portError.name)
    })
  })

  describe('TestOnlyError', () => {
    it('should create a TestOnlyError with correct name and message', () => {
      const message = 'This error should only occur in tests'
      const error = new TestOnlyError(message)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(TestOnlyError)
      expect(error.name).toBe('TestOnlyError')
      expect(error.message).toBe(message)
      expect(error.stack).toBeDefined()
    })

    it('should handle null-like message values', () => {
      const error = new TestOnlyError('null')
      
      expect(error.message).toBe('null')
      expect(error.name).toBe('TestOnlyError')
    })

    it('should handle numeric strings in message', () => {
      const message = '123456'
      const error = new TestOnlyError(message)
      
      expect(error.message).toBe(message)
    })

    it('should maintain correct prototype chain', () => {
      const error = new TestOnlyError('test')
      
      expect(Object.getPrototypeOf(error)).toBe(TestOnlyError.prototype)
      expect(error instanceof TestOnlyError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should work correctly in async contexts', async () => {
      const createAsyncError = async () => {
        return new TestOnlyError('async test error')
      }

      const error = await createAsyncError()
      
      expect(error).toBeInstanceOf(TestOnlyError)
      expect(error.message).toBe('async test error')
    })
  })

  describe('AbsentPortDisconnectionError', () => {
    it('should create an AbsentPortDisconnectionError with correct name and message', () => {
      const message = 'Attempted to disconnect a port that does not exist'
      const error = new AbsentPortDisconnectionError(message)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AbsentPortDisconnectionError)
      expect(error.name).toBe('AbsentPortDisconnectionError')
      expect(error.message).toBe(message)
      expect(error.stack).toBeDefined()
    })

    it('should handle complex error messages with details', () => {
      const message = 'Port "worker-123" not found in registry during disconnection attempt'
      const error = new AbsentPortDisconnectionError(message)
      
      expect(error.message).toBe(message)
    })

    it('should handle messages with special formatting', () => {
      const message = 'Port disconnection failed:\n  - Port ID: missing\n  - Status: not_found'
      const error = new AbsentPortDisconnectionError(message)
      
      expect(error.message).toBe(message)
    })

    it('should maintain correct prototype chain', () => {
      const error = new AbsentPortDisconnectionError('test')
      
      expect(Object.getPrototypeOf(error)).toBe(AbsentPortDisconnectionError.prototype)
      expect(error instanceof AbsentPortDisconnectionError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should be catchable in try-catch blocks', () => {
      let caughtError: Error | null = null

      try {
        throw new AbsentPortDisconnectionError('test disconnection error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).toBeInstanceOf(AbsentPortDisconnectionError)
      expect(caughtError?.message).toBe('test disconnection error')
    })
  })
})

describe('Error Inheritance and Type Safety', () => {
  it('should maintain proper inheritance hierarchy for all error types', () => {
    const errors = [
      new NoPortsError('no ports'),
      new PortDoubleInitError('port double init'),
      new WorkerDoubleInitError('worker double init'),
      new TestOnlyError('test only'),
      new AbsentPortDisconnectionError('absent port')
    ]

    errors.forEach(error => {
      expect(error instanceof Error).toBe(true)
      expect(error.name).toBeTruthy()
      expect(error.message).toBeTruthy()
      expect(error.stack).toBeDefined()
    })
  })

  it('should have unique names for each error type', () => {
    const errorNames = [
      new NoPortsError('test').name,
      new PortDoubleInitError('test').name,
      new WorkerDoubleInitError('test').name,
      new TestOnlyError('test').name,
      new AbsentPortDisconnectionError('test').name
    ]

    const uniqueNames = new Set(errorNames)
    expect(uniqueNames.size).toBe(errorNames.length)
  })

  it('should allow proper type checking with instanceof', () => {
    const noPortsError = new NoPortsError('test')
    const portDoubleError = new PortDoubleInitError('test')
    
    expect(noPortsError instanceof NoPortsError).toBe(true)
    expect(noPortsError instanceof PortDoubleInitError).toBe(false)
    expect(portDoubleError instanceof PortDoubleInitError).toBe(true)
    expect(portDoubleError instanceof NoPortsError).toBe(false)
  })

  it('should work correctly with Error.prototype methods', () => {
    const error = new TestOnlyError('test error')
    
    expect(error.toString()).toContain('TestOnlyError')
    expect(error.toString()).toContain('test error')
    expect(typeof error.valueOf()).toBe('object')
  })
})

describe('Error Scenarios and Edge Cases', () => {
  it('should handle extremely long messages without issues', () => {
    const veryLongMessage = 'Error: ' + 'x'.repeat(100000)
    const error = new NoPortsError(veryLongMessage)
    
    expect(error.message.length).toBe(100007)
    expect(error.name).toBe('NoPortsError')
  })

  it('should work with Object.assign and spread operations', () => {
    const error = new WorkerDoubleInitError('original message')
    const copied = Object.assign({}, error)
    
    expect(copied.name).toBe('WorkerDoubleInitError')
    expect(copied.message).toBe('original message')
  })

  it('should maintain identity after serialization/deserialization cycles', () => {
    const originalError = new AbsentPortDisconnectionError('serialization test')
    const serialized = JSON.stringify(originalError)
    const deserialized = JSON.parse(serialized)
    
    expect(deserialized.name).toBe('AbsentPortDisconnectionError')
    expect(deserialized.message).toBe('serialization test')
  })

  it('should handle concurrent error creation without issues', async () => {
    const createErrors = async (count: number) => {
      const promises = Array.from({ length: count }, (_, i) => 
        Promise.resolve(new TestOnlyError(`concurrent error ${i}`))
      )
      return Promise.all(promises)
    }

    const errors = await createErrors(50)
    
    expect(errors.length).toBe(50)
    errors.forEach((error, index) => {
      expect(error.message).toBe(`concurrent error ${index}`)
      expect(error instanceof TestOnlyError).toBe(true)
    })
  })

  it('should work correctly when extended further', () => {
    class CustomNoPortsError extends NoPortsError {
      public readonly code: string
      
      constructor(message: string, code: string) {
        super(message)
        this.name = 'CustomNoPortsError'
        this.code = code
        Object.setPrototypeOf(this, CustomNoPortsError.prototype)
      }
    }

    const customError = new CustomNoPortsError('custom message', 'ERR001')
    
    expect(customError instanceof CustomNoPortsError).toBe(true)
    expect(customError instanceof NoPortsError).toBe(true)
    expect(customError instanceof Error).toBe(true)
    expect(customError.name).toBe('CustomNoPortsError')
    expect(customError.code).toBe('ERR001')
  })
})

describe('Integration with Error Handling Patterns', () => {
  it('should work with Promise.reject and async/await error handling', async () => {
    const asyncFunction = async (shouldFail: boolean) => {
      if (shouldFail) {
        throw new PortDoubleInitError('Async port init failure')
      }
      return 'success'
    }

    await expect(asyncFunction(true)).rejects.toThrow(PortDoubleInitError)
    await expect(asyncFunction(true)).rejects.toThrow('Async port init failure')
    await expect(asyncFunction(false)).resolves.toBe('success')
  })

  it('should work with error aggregation patterns', () => {
    const errors: Error[] = [
      new NoPortsError('No ports available'),
      new WorkerDoubleInitError('Worker already initialized'),
      new TestOnlyError('Test failure')
    ]

    const errorMessages = errors.map(e => e.message)
    const errorNames = errors.map(e => e.name)
    
    expect(errorMessages).toContain('No ports available')
    expect(errorMessages).toContain('Worker already initialized')
    expect(errorMessages).toContain('Test failure')
    
    expect(errorNames).toContain('NoPortsError')
    expect(errorNames).toContain('WorkerDoubleInitError')
    expect(errorNames).toContain('TestOnlyError')
  })

  it('should maintain proper behavior when used in event handlers', () => {
    const errorHandler = (error: Error) => {
      if (error instanceof AbsentPortDisconnectionError) {
        return 'handled disconnection error'
      }
      return 'unknown error'
    }

    const disconnectionError = new AbsentPortDisconnectionError('port not found')
    const genericError = new Error('generic error')
    
    expect(errorHandler(disconnectionError)).toBe('handled disconnection error')
    expect(errorHandler(genericError)).toBe('unknown error')
  })
})