import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { BrowserLocalFirst } from './browser'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'
import {
  type UpstreamWorkerMessage,
  UpstreamWorkerMessageType
} from '../../../types/messages/worker/UpstreamWorkerMessage'
import type { TestingTransition } from '../../../testing/transitions'
import { TransitionImpact } from '../../../types/transitions/Transition'

describe('BrowserLocalFirst', () => {
  describe('Worker', () => {
    describe('message posting via .postMessage()', () => {
      let mockWorker: Worker
      beforeEach(() => {
        mockWorker = {
          postMessage: vi.fn()
        } as unknown as Worker
      })

      it('inits', () => {
        new BrowserLocalFirst({
          dbName: DB_NAME,
          wsUrl: SOCKET_URL,
          worker: mockWorker
        })

        expect(mockWorker.postMessage).toHaveBeenCalledExactlyOnceWith({
          type: UpstreamWorkerMessageType.Init,
          data: {
            dbName: DB_NAME,
            wsUrl: SOCKET_URL
          }
        } satisfies UpstreamWorkerMessage<TestingTransition>)
      })

      it('sends transitions', () => {
        const syncEngine = new BrowserLocalFirst<TestingTransition>({
          dbName: DB_NAME,
          wsUrl: SOCKET_URL,
          worker: mockWorker
        })
        syncEngine.transition({
          action: 'shift_foo_bar',
          impact: TransitionImpact.LocalOnly
        })

        expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
          type: UpstreamWorkerMessageType.Transition,
          data: {
            action: 'shift_foo_bar',
            impact: TransitionImpact.LocalOnly
          }
        })
      })
    })
  })

  describe('SharedWorker', () => {
    describe('message posting via .port.postMessage()', () => {
      type TestingSharedWorker = SharedWorker & {
        postMessage: Worker['postMessage']
      }
      let mockWorker: TestingSharedWorker
      beforeEach(() => {
        mockWorker = {
          port: { postMessage: vi.fn() },
          postMessage: vi.fn()
        } as unknown as TestingSharedWorker
      })

      it('inits', () => {
        new BrowserLocalFirst({
          dbName: DB_NAME,
          wsUrl: SOCKET_URL,
          worker: mockWorker
        })

        expect(mockWorker.port.postMessage).toHaveBeenCalledExactlyOnceWith({
          type: UpstreamWorkerMessageType.Init,
          data: {
            dbName: DB_NAME,
            wsUrl: SOCKET_URL
          }
        } satisfies UpstreamWorkerMessage<TestingTransition>)
        expect(mockWorker.postMessage).not.toBeCalled()
      })

      it('sends transitions', () => {
        const syncEngine = new BrowserLocalFirst<TestingTransition>({
          dbName: DB_NAME,
          wsUrl: SOCKET_URL,
          worker: mockWorker
        })
        syncEngine.transition({
          action: 'shift_foo_bar',
          impact: TransitionImpact.LocalOnly
        })

        expect(mockWorker.port.postMessage).toHaveBeenLastCalledWith({
          type: UpstreamWorkerMessageType.Transition,
          data: {
            action: 'shift_foo_bar',
            impact: TransitionImpact.LocalOnly
          }
        })
        expect(mockWorker.postMessage).not.toBeCalled()
      })
    })
  })
})

describe('Constructor edge cases', () => {
  let mockWorker: Worker
  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn()
    } as unknown as Worker
  })

  it('handles empty string parameters', () => {
    expect(() => {
      new BrowserLocalFirst({
        dbName: '',
        wsUrl: '',
        worker: mockWorker
      })
    }).not.toThrow()

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: UpstreamWorkerMessageType.Init,
      data: {
        dbName: '',
        wsUrl: ''
      }
    })
  })

  it('handles special characters in parameters', () => {
    const specialDbName = 'db-name_with.special/chars@2024'
    const specialUrl = 'wss://api.example.com:8080/ws?token=abc123&v=2.0'

    expect(() => {
      new BrowserLocalFirst({
        dbName: specialDbName,
        wsUrl: specialUrl,
        worker: mockWorker
      })
    }).not.toThrow()

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: UpstreamWorkerMessageType.Init,
      data: {
        dbName: specialDbName,
        wsUrl: specialUrl
      }
    })
  })

  it('handles very long parameter strings', () => {
    const longDbName = 'a'.repeat(1000)
    const longUrl = 'wss://example.com/' + 'b'.repeat(500)

    expect(() => {
      new BrowserLocalFirst({
        dbName: longDbName,
        wsUrl: longUrl,
        worker: mockWorker
      })
    }).not.toThrow()
  })

  it('throws when worker is null', () => {
    expect(() => {
      new BrowserLocalFirst({
        dbName: DB_NAME,
        wsUrl: SOCKET_URL,
        worker: null as unknown as Worker
      })
    }).toThrow()
  })

  it('throws when worker is undefined', () => {
    expect(() => {
      new BrowserLocalFirst({
        dbName: DB_NAME,
        wsUrl: SOCKET_URL,
        worker: undefined as unknown as Worker
      })
    }).toThrow()
  })
})

describe('submitWorkerMessage private method behavior', () => {
  it('prioritizes SharedWorker port over direct postMessage when both exist', () => {
    const hybridWorker = {
      port: { postMessage: vi.fn() },
      postMessage: vi.fn()
    } as unknown as SharedWorker

    new BrowserLocalFirst({
      dbName: DB_NAME,
      wsUrl: SOCKET_URL,
      worker: hybridWorker
    })

    expect(hybridWorker.port.postMessage).toHaveBeenCalled()
    expect(hybridWorker.postMessage).not.toHaveBeenCalled()
  })

  it('uses direct postMessage when port is not available', () => {
    const regularWorker = {
      postMessage: vi.fn()
    } as unknown as Worker

    new BrowserLocalFirst({
      dbName: DB_NAME,
      wsUrl: SOCKET_URL,
      worker: regularWorker
    })

    expect(regularWorker.postMessage).toHaveBeenCalled()
  })

  it('handles worker with port but no postMessage on port', () => {
    const faultySharedWorker = {
      port: {}
    } as unknown as SharedWorker

    expect(() => {
      new BrowserLocalFirst({
        dbName: DB_NAME,
        wsUrl: SOCKET_URL,
        worker: faultySharedWorker
      })
    }).toThrow()
  })
})

describe('Transition method comprehensive testing', () => {
  let mockWorker: Worker
  let syncEngine: BrowserLocalFirst<TestingTransition>

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn()
    } as unknown as Worker
    syncEngine = new BrowserLocalFirst<TestingTransition>({
      dbName: DB_NAME,
      wsUrl: SOCKET_URL,
      worker: mockWorker
    })
    vi.clearAllMocks()
  })

  it('handles all TransitionImpact enum values', () => {
    const impactTypes = [
      TransitionImpact.LocalOnly,
      TransitionImpact.RemoteOnly,
      TransitionImpact.Both
    ] as const

    impactTypes.forEach((impact, index) => {
      syncEngine.transition({
        action: `test_action_${index}`,
        impact
      })

      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(index + 1, {
        type: UpstreamWorkerMessageType.Transition,
        data: {
          action: `test_action_${index}`,
          impact
        }
      })
    })
  })

  it('handles empty action string', () => {
    syncEngine.transition({
      action: '',
      impact: TransitionImpact.LocalOnly
    })

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: UpstreamWorkerMessageType.Transition,
      data: {
        action: '',
        impact: TransitionImpact.LocalOnly
      }
    })
  })

  it('handles complex action strings with special characters', () => {
    const complexActions = [
      'action_with_underscores',
      'action-with-dashes',
      'action.with.dots',
      'action with spaces',
      'action/with/slashes',
      'action\\with\\backslashes',
      'action:with:colons',
      'action|with|pipes',
      'action#with#hashes',
      'action@with@ats',
      'action$with$dollars',
      'action%with%percents',
      'action^with^carets',
      'action&with&ampersands',
      'action*with*asterisks',
      'action+with+plus',
      'action=with=equals',
      '🚀_emoji_action_🎉',
      '中文动作',
      'Ação_português',
      'акция_русский'
    ]

    complexActions.forEach((action, index) => {
      syncEngine.transition({
        action,
        impact: TransitionImpact.LocalOnly
      })

      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(index + 1, {
        type: UpstreamWorkerMessageType.Transition,
        data: {
          action,
          impact: TransitionImpact.LocalOnly
        }
      })
    })
  })

  it('maintains correct message order with mixed impact types', () => {
    const transitions = [
      { action: 'first', impact: TransitionImpact.LocalOnly },
      { action: 'second', impact: TransitionImpact.RemoteOnly },
      { action: 'third', impact: TransitionImpact.Both },
      { action: 'fourth', impact: TransitionImpact.LocalOnly },
      { action: 'fifth', impact: TransitionImpact.RemoteOnly }
    ]

    transitions.forEach((transition) => {
      syncEngine.transition(transition)
    })

    const calls = (mockWorker.postMessage as Mock).mock.calls
    transitions.forEach((transition, index) => {
      expect(calls[index][0]).toEqual({
        type: UpstreamWorkerMessageType.Transition,
        data: transition
      })
    })
  })
})

describe('Message structure validation', () => {
  let mockWorker: Worker

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn()
    } as unknown as Worker
  })

  it('ensures init message has correct structure', () => {
    new BrowserLocalFirst({
      dbName: 'test_db',
      wsUrl: 'wss://test.url',
      worker: mockWorker
    })

    const initMessage = (mockWorker.postMessage as Mock).mock.calls[0][0]

    expect(initMessage).toHaveProperty('type')
    expect(initMessage).toHaveProperty('data')
    expect(initMessage.type).toBe(UpstreamWorkerMessageType.Init)
    expect(initMessage.data).toHaveProperty('dbName')
    expect(initMessage.data).toHaveProperty('wsUrl')
    expect(initMessage.data.dbName).toBe('test_db')
    expect(initMessage.data.wsUrl).toBe('wss://test.url')
  })

  it('ensures transition message has correct structure', () => {
    const syncEngine = new BrowserLocalFirst<TestingTransition>({
      dbName: DB_NAME,
      wsUrl: SOCKET_URL,
      worker: mockWorker
    })
    vi.clearAllMocks()

    const testTransition = {
      action: 'test_action',
      impact: TransitionImpact.Both
    }

    syncEngine.transition(testTransition)

    const transitionMessage = (mockWorker.postMessage as Mock).mock.calls[0][0]

    expect(transitionMessage).toHaveProperty('type')
    expect(transitionMessage).toHaveProperty('data')
    expect(transitionMessage.type).toBe(UpstreamWorkerMessageType.Transition)
    expect(transitionMessage.data).toEqual(testTransition)
  })

  it('preserves all properties in transition data', () => {
    interface ExtendedTransition extends TestingTransition {
      metadata?: unknown
      timestamp?: number
      userId?: string
    }

    const syncEngine = new BrowserLocalFirst<ExtendedTransition>({
      dbName: DB_NAME,
      wsUrl: SOCKET_URL,
      worker: mockWorker
    })
    vi.clearAllMocks()

    const complexTransition: ExtendedTransition = {
      action: 'complex_action',
      impact: TransitionImpact.Both,
      metadata: { key: 'value', nested: { prop: 123 } },
      timestamp: Date.now(),
      userId: 'user123'
    }

    syncEngine.transition(complexTransition)

    const message = (mockWorker.postMessage as Mock).mock.calls[0][0]
    expect(message.data).toEqual(complexTransition)
  })
})

describe('Real-world usage scenarios', () => {
  it('handles production-like URLs and database names', () => {
    const productionConfigs = [
      {
        dbName: 'prod_app_v3.2.1',
        wsUrl: 'wss://sync.production.com:443/ws?version=3&auth=token123'
      },
      {
        dbName: 'staging_app_2024_q1',
        wsUrl: 'wss://staging-api.company.io/websocket'
      },
      {
        dbName: 'dev_branch_feature_xyz',
        wsUrl: 'ws://localhost:8080/dev-sync'
      }
    ]

    productionConfigs.forEach((config) => {
      const mockWorker = { postMessage: vi.fn() } as unknown as Worker

      expect(() => {
        new BrowserLocalFirst({
          ...config,
          worker: mockWorker
        })
      }).not.toThrow()

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: UpstreamWorkerMessageType.Init,
        data: {
          dbName: config.dbName,
          wsUrl: config.wsUrl
        }
      })
    })
  })
})