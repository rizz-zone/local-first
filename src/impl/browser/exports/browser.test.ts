import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  describe('Error Handling', () => {
    describe('Worker', () => {
      let mockWorker: Worker

      beforeEach(() => {
        mockWorker = {
          postMessage: vi.fn()
        } as unknown as Worker
      })

      it('handles invalid initialization parameters gracefully', () => {
        expect(() => {
          new BrowserLocalFirst({
            dbName: '',
            wsUrl: SOCKET_URL,
            worker: mockWorker
          })
        }).not.toThrow()

        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: '',
            worker: mockWorker
          })
        }).not.toThrow()
      })

      it('handles null/undefined worker gracefully', () => {
        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: SOCKET_URL,
            worker: null as unknown as Worker
          })
        }).toThrow()

        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: SOCKET_URL,
            worker: undefined as unknown as Worker
          })
        }).toThrow()
      })

      it('handles postMessage failures gracefully', () => {
        const failingWorker = {
          postMessage: vi.fn().mockImplementation(() => {
            throw new Error('Worker communication failed')
          })
        } as unknown as Worker

        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: SOCKET_URL,
            worker: failingWorker
          })
        }).toThrow('Worker communication failed')
      })
    })

    describe('SharedWorker', () => {
      type TestingSharedWorker = SharedWorker & {
        postMessage: Worker['postMessage']
      }

      it('handles port.postMessage failures gracefully', () => {
        const failingSharedWorker = {
          port: {
            postMessage: vi.fn().mockImplementation(() => {
              throw new Error('SharedWorker port communication failed')
            })
          },
          postMessage: vi.fn()
        } as unknown as TestingSharedWorker

        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: SOCKET_URL,
            worker: failingSharedWorker
          })
        }).toThrow('SharedWorker port communication failed')
      })

      it('handles missing port gracefully', () => {
        const invalidSharedWorker = {
          port: null,
          postMessage: vi.fn()
        } as unknown as TestingSharedWorker

        expect(() => {
          new BrowserLocalFirst({
            dbName: DB_NAME,
            wsUrl: SOCKET_URL,
            worker: invalidSharedWorker
          })
        }).toThrow()
      })
    })
  })

  describe('Transition Edge Cases', () => {
    describe('Worker', () => {
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

      it('handles transition with different impact types', () => {
        const impacts = [
          TransitionImpact.LocalOnly,
          TransitionImpact.SomethingElse
        ] as const

        impacts.forEach(impact => {
          syncEngine.transition({
            action: `test_action_${impact}`,
            impact
          })

          expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
            type: UpstreamWorkerMessageType.Transition,
            data: {
              action: `test_action_${impact}`,
              impact
            }
          })
        })

        expect(mockWorker.postMessage).toHaveBeenCalledTimes(impacts.length)
      })

      it('handles transition with empty action string', () => {
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

      it('handles transition with numeric action', () => {
        syncEngine.transition({
          action: 12345,
          impact: TransitionImpact.LocalOnly
        })

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: UpstreamWorkerMessageType.Transition,
          data: {
            action: 12345,
            impact: TransitionImpact.LocalOnly
          }
        })
      })

      it('handles transition with special characters in action', () => {
        const specialAction = 'special!@#$%^&*()_+-={}[]|\\:";\'<>?,./action'
        syncEngine.transition({
          action: specialAction,
          impact: TransitionImpact.LocalOnly
        })

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: UpstreamWorkerMessageType.Transition,
          data: {
            action: specialAction,
            impact: TransitionImpact.LocalOnly
          }
        })
      })

      it('handles transition with optional data field', () => {
        const transitionWithData = {
          action: 'test_with_data',
          impact: TransitionImpact.LocalOnly,
          data: { userId: 123, timestamp: Date.now() }
        }

        syncEngine.transition(transitionWithData)

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
          type: UpstreamWorkerMessageType.Transition,
          data: transitionWithData
        })
      })

      it('handles multiple rapid transitions', () => {
        const transitions = [
          { action: 'action1', impact: TransitionImpact.LocalOnly },
          { action: 'action2', impact: TransitionImpact.SomethingElse },
          { action: 'action3', impact: TransitionImpact.LocalOnly }
        ] as const

        transitions.forEach(transition => {
          syncEngine.transition(transition)
        })

        expect(mockWorker.postMessage).toHaveBeenCalledTimes(transitions.length)
        transitions.forEach((transition, index) => {
          expect(mockWorker.postMessage).toHaveBeenNthCalledWith(index + 1, {
            type: UpstreamWorkerMessageType.Transition,
            data: transition
          })
        })
      })

      it('handles transition when worker.postMessage throws', () => {
        mockWorker.postMessage = vi.fn().mockImplementation(() => {
          throw new Error('Worker unavailable')
        })

        expect(() => {
          syncEngine.transition({
            action: 'test_action',
            impact: TransitionImpact.LocalOnly
          })
        }).toThrow('Worker unavailable')
      })
    })

    describe('SharedWorker', () => {
      type TestingSharedWorker = SharedWorker & {
        postMessage: Worker['postMessage']
      }
      let mockWorker: TestingSharedWorker
      let syncEngine: BrowserLocalFirst<TestingTransition>

      beforeEach(() => {
        mockWorker = {
          port: { postMessage: vi.fn() },
          postMessage: vi.fn()
        } as unknown as TestingSharedWorker
        syncEngine = new BrowserLocalFirst<TestingTransition>({
          dbName: DB_NAME,
          wsUrl: SOCKET_URL,
          worker: mockWorker
        })
        vi.clearAllMocks()
      })

      it('handles transition when port.postMessage throws', () => {
        mockWorker.port.postMessage = vi.fn().mockImplementation(() => {
          throw new Error('SharedWorker port unavailable')
        })

        expect(() => {
          syncEngine.transition({
            action: 'test_action',
            impact: TransitionImpact.LocalOnly
          })
        }).toThrow('SharedWorker port unavailable')
      })

      it('ensures regular postMessage is never called during transitions', () => {
        const transitions = [
          { action: 'action1', impact: TransitionImpact.LocalOnly },
          { action: 'action2', impact: TransitionImpact.SomethingElse },
          { action: 'action3', impact: TransitionImpact.LocalOnly }
        ] as const

        transitions.forEach(transition => {
          syncEngine.transition(transition)
        })

        expect(mockWorker.postMessage).not.toHaveBeenCalled()
        expect(mockWorker.port.postMessage).toHaveBeenCalledTimes(transitions.length)
      })
    })
  })

  describe('Worker Detection Logic', () => {
    it('handles objects with port property that are not SharedWorkers', () => {
      const ambiguousWorker = {
        port: { postMessage: vi.fn() },
        postMessage: vi.fn(),
        someOtherProperty: 'test'
      } as unknown as Worker | SharedWorker

      new BrowserLocalFirst({
        dbName: DB_NAME,
        wsUrl: SOCKET_URL,
        worker: ambiguousWorker
      })

      // Should still use port.postMessage since 'port' property exists
      expect((ambiguousWorker as SharedWorker).port.postMessage).toHaveBeenCalled()
      expect((ambiguousWorker as Worker).postMessage).not.toHaveBeenCalled()
    })
  })
})