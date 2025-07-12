import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { clientMachine } from './worker'
import { createActor } from 'xstate'
import { http, ws } from 'msw'
import { setupServer } from 'msw/node'
import { SOCKET_URL } from '../../../testing/constants'

const socketEndpoint = ws.link(SOCKET_URL)
const server = setupServer(
  socketEndpoint.addEventListener('connection', (server) => {
    server.server.connect()
  }),
  // We shouldn't need this but msw complains (without an error) if we don't have it
  http.get(SOCKET_URL.replace('wss', 'https'), () => {
    return new Response()
  })
)

describe('cleanup and resource management', () => {
  let WebSocketOriginal: typeof WebSocket
  let mockSocket: any

  beforeAll(() => {
    WebSocketOriginal = globalThis.WebSocket
  })

  beforeEach(() => {
    mockSocket = {
      readyState: WebSocket.OPEN,
      close: vi.fn(),
      send: vi.fn(),
      onopen: null,
      onerror: null,
      onclose: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }
    const WebSocketMock = vi.fn().mockReturnValue(mockSocket)
    globalThis.WebSocket = WebSocketMock as unknown as typeof WebSocket
  })

  afterAll(() => {
    globalThis.WebSocket = WebSocketOriginal
  })

  it('handles stopping machine before initialization', () => {
    const machine = createActor(clientMachine)
    machine.start()

    // Stop before init - should not throw
    expect(() => machine.stop()).not.toThrow()
  })

  it('handles stopping machine after initialization', () => {
    const machine = createActor(clientMachine)
    machine.start()
    machine.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'cleanup-test'
    })

    // Stop after init - should not throw
    expect(() => machine.stop()).not.toThrow()
  })

  it('handles stopping machine multiple times', () => {
    const machine = createActor(clientMachine)
    machine.start()
    machine.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'multi-stop-test'
    })

    // Stop multiple times - should not throw
    expect(() => {
      machine.stop()
      machine.stop()
    }).not.toThrow()
  })
})

describe('lock mechanism edge cases', () => {
  const lockMethod = vi.fn()
  const clearLockState = () => {
    lockMethod.mockClear()
  }

  beforeAll(() => {
    // @ts-expect-error navigator.locks doesn't exist in jsdom
    navigator.locks = { request: lockMethod }
  })
  beforeAll(clearLockState)
  afterEach(clearLockState)

  it('handles missing navigator.locks gracefully', () => {
    // Temporarily remove navigator.locks
    const originalLocks = navigator.locks
    // @ts-expect-error testing missing navigator.locks
    delete navigator.locks

    try {
      const machine = createActor(clientMachine)
      machine.start()

      // Should throw when trying to access navigator.locks
      expect(() => {
        machine.send({
          type: 'init',
          wsUrl: SOCKET_URL,
          dbName: 'no-locks-test'
        })
      }).toThrow()
    } finally {
      // Restore navigator.locks
      // @ts-expect-error restoring navigator.locks
      navigator.locks = originalLocks
    }
  })

  it('handles lock request with different resource names', () => {
    const machine1 = createActor(clientMachine)
    const machine2 = createActor(clientMachine)

    machine1.start()
    machine2.start()

    machine1.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'db1'
    })

    machine2.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'db2'
    })

    // Both should request locks
    expect(lockMethod).toHaveBeenCalledTimes(2)
  })

  it('handles superiority state transitions correctly', async () => {
    const machine = createActor(clientMachine)
    machine.start()

    // Initial state should be follower
    expect(machine.getSnapshot().value.superiority).toBe('follower')

    machine.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'superiority-test'
    })

    // Should still be follower after init
    expect(machine.getSnapshot().value.superiority).toBe('follower')

    // Send leader lock acquired event
    machine.send({ type: 'leader lock acquired' })

    await vi.waitUntil(
      () => machine.getSnapshot().value.superiority === 'leader',
      { timeout: 500, interval: 20 }
    )

    expect(machine.getSnapshot().value.superiority).toBe('leader')
  })
})

describe('parallel state validation', () => {
  it('maintains independent parallel states', async () => {
    const machine = createActor(clientMachine)
    machine.start()

    // Initial parallel state
    expect(machine.getSnapshot().value).toEqual({
      websocket: 'disconnected',
      db: 'disconnected',
      superiority: 'follower'
    })

    // Init should trigger actions in multiple parallel states
    machine.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'parallel-test'
    })

    // WebSocket and DB states should remain independent
    machine.send({ type: 'ws connected' })

    await vi.waitUntil(
      () => machine.getSnapshot().value.websocket === 'connected',
      { timeout: 500, interval: 20 }
    )

    // WebSocket connected but DB still disconnected
    expect(machine.getSnapshot().value).toEqual({
      websocket: 'connected',
      db: 'disconnected',
      superiority: 'follower'
    })

    // Connect DB independently
    machine.send({ type: 'db connected' })

    await vi.waitUntil(
      () => machine.getSnapshot().value.db === 'connected',
      { timeout: 500, interval: 20 }
    )

    expect(machine.getSnapshot().value).toEqual({
      websocket: 'connected',
      db: 'connected',
      superiority: 'follower'
    })
  })

  it('handles final states correctly', async () => {
    const machine = createActor(clientMachine)
    machine.start()

    // Move to final states
    machine.send({ type: 'db connected' })
    machine.send({ type: 'leader lock acquired' })

    await vi.waitUntil(
      () => {
        const snapshot = machine.getSnapshot()
        return snapshot.value.db === 'connected' && snapshot.value.superiority === 'leader'
      },
      { timeout: 500, interval: 20 }
    )

    const snapshot = machine.getSnapshot()
    expect(snapshot.value.db).toBe('connected')
    expect(snapshot.value.superiority).toBe('leader')
  })
})

describe('socket use', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('changes state after successfully connecting', async () => {
    const machine = createActor(clientMachine)
    machine.start()
    machine.send({
      type: 'init',
      wsUrl: SOCKET_URL,
      dbName: 'jerry'
    })

    await vi.waitUntil(
      () => machine.getSnapshot().value.websocket === 'connected',
      { timeout: 500, interval: 20 }
    )

    expect(machine.getSnapshot().value).toEqual({
      websocket: 'connected',
      db: 'disconnected',
      superiority: 'follower'
    })
  })
})