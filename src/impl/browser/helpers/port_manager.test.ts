import { describe, it, expect } from 'vitest'
import * as portManager from './port_manager'

describe('port_manager', () => {
  it('should export an init function', () => {
    expect(typeof portManager.init).toBe('function')
  })
})