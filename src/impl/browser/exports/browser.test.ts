import type {
  UpstreamWorkerMessage,
  UpstreamWorkerMessageType
} from '../../../types/messages/worker/UpstreamWorkerMessage'

interface BrowserLocalFirstConfig<T> {
  dbName: string
  wsUrl: string
  worker: Worker | SharedWorker
}

export class BrowserLocalFirst<T> {
  private postMessageFn: (message: UpstreamWorkerMessage<T>) => void

  constructor({ dbName, wsUrl, worker }: BrowserLocalFirstConfig<T>) {
    if (isSharedWorker(worker)) {
      this.postMessageFn = (message) => {
        try {
          worker.port.postMessage(message)
        } catch {
          // swallow communication errors
        }
      }
    } else {
      this.postMessageFn = (message) => {
        try {
          worker.postMessage(message)
        } catch {
          // swallow communication errors
        }
      }
    }

    this.postMessageFn({
      type: UpstreamWorkerMessageType.Init,
      data: { dbName, wsUrl }
    })
  }

  transition(data: T): void {
    this.postMessageFn({
      type: UpstreamWorkerMessageType.Transition,
      data
    })
  }
}

function isSharedWorker(
  worker: Worker | SharedWorker
): worker is SharedWorker & { port: MessagePort } {
  return (
    typeof (worker as SharedWorker).port === 'object' &&
    typeof (worker as SharedWorker).port.postMessage === 'function'
  )
}