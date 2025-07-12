import { describe, it, expect } from 'vitest'
import {
  portManager,
  __testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort as WorkerPort
} from './port_manager'

describe('WorkerPort', () => {
  it('should be defined', () => {
    expect(WorkerPort).toBeDefined()
  })
})

describe('portManager', () => {
  it('should expose init function', () => {
    expect(typeof portManager.init).toBe('function')
  })
})