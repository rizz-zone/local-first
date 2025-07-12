import { portManager } from '../../helpers/port_manager'
import { WorkerDoubleInitError } from '../../../../common/errors'

let initialized = false

export function sharedWorkerEntrypoint(): void {
  if (initialized) {
    throw new WorkerDoubleInitError(
      `SharedWorker entrypoint called twice. To resolve this:\n` +
      ` - Only call sharedWorkerEntrypoint() once throughout the lifecycle of the worker\n` +
      ` - Do not run any other code inside of your worker.`
    )
  }
  initialized = true
  portManager.init()
}