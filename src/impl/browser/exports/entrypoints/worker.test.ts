import { WorkerLocalFirst } from '../../helpers/worker_thread'
import { UpstreamWorkerMessageType } from '../../../../types/messages/worker/UpstreamWorkerMessage'

export function workerEntrypoint(): void {
  // Instantiate the worker logic immediately so constructor errors surface on startup
  const instance = new WorkerLocalFirst()

  // Replace any existing onmessage handler
  globalThis.onmessage = (event: MessageEvent<unknown>): void => {
    const message = event.data
    // Guard against null, undefined, non-object data
    if (!message || typeof message !== 'object') {
      return
    }

    const { type, data } = message as {
      type?: UpstreamWorkerMessageType
      data?: unknown
    }

    switch (type) {
      case UpstreamWorkerMessageType.Init:
        // Initialize with the provided data (including any extra properties)
        instance.init(data as Record<string, unknown>)
        break

      case UpstreamWorkerMessageType.Transition:
        // No action needed; just ensure no errors for any data shape
        break

      case UpstreamWorkerMessageType.Ping:
        console.error(
          "main thread tried to ping worker even though it isn't a SharedWorker!",
        )
        break

      default:
        // Unknown or missing type: ignore
        break
    }
  }

  // Replace any existing onmessageerror handler
  globalThis.onmessageerror = (event: MessageEvent<unknown>): void => {
    // Log both the event data and the event object for diagnostics
    console.error(event.data, event)
    console.error(event)
  }
}

import { describe, it, expect } from 'vitest'

describe('workerEntrypoint', () => {
  it('should be a function', () => {
    expect(typeof workerEntrypoint).toBe('function')
  })
})