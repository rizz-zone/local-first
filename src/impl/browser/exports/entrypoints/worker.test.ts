import { WorkerLocalFirst } from '../../helpers/worker_thread'
import { UpstreamWorkerMessageType } from '../../../../types/messages/worker/UpstreamWorkerMessage'

export function workerEntrypoint<TransitionSchema = unknown>(): void {
  const instance = new WorkerLocalFirst()

  globalThis.onmessage = (event: MessageEvent) => {
    const msg = event.data
    if (msg == null || typeof msg !== 'object') {
      return
    }
    const type = (msg as { type?: unknown }).type as UpstreamWorkerMessageType | undefined
    try {
      switch (type) {
        case UpstreamWorkerMessageType.Init: {
          const { wsUrl, dbName } = (msg as { data: any }).data
          instance.init({ wsUrl, dbName })
          break
        }
        case UpstreamWorkerMessageType.Ping: {
          console.error(
            "main thread tried to ping worker even though it isn't a SharedWorker!"
          )
          break
        }
        case UpstreamWorkerMessageType.Transition: {
          // ignore transition messages
          break
        }
        default:
          // ignore unknown message types
          break
      }
    } catch (err) {
      throw err
    }
  }

  globalThis.onmessageerror = (event: MessageEvent) => {
    console.error('Message error!')
    console.error(event)
  }
}