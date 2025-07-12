import { portManager } from '../../helpers/port_manager'

let initialized = false

export function sharedWorkerEntrypoint(): void {
  if (initialized) {
    return
  }
  initialized = true
  portManager.init()
}