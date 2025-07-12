/// <reference lib="webworker" />

import {
  NoPortsError,
  PortDoubleInitError,
  DOUBLE_SHAREDWORKER_PORT_INIT
} from '../../../common/errors'
import {
  UpstreamWorkerMessageType,
  type UpstreamWorkerMessage
} from '../../../types/messages/worker/UpstreamWorkerMessage'

interface InstanceData {
  wsUrl: string
  dbName: string
}

class WorkerPort {
  public static instances: Map<string, WorkerPort> = new Map()
  public static activeInstanceClients: Map<string, number> = new Map()

  private instanceKey?: string

  constructor(public port: MessagePort) {}

  public init(data: InstanceData) {
    if (!data || typeof data.wsUrl !== 'string' || typeof data.dbName !== 'string') {
      throw new Error('Invalid init data')
    }
    if (this.instanceKey) {
      throw new PortDoubleInitError(DOUBLE_SHAREDWORKER_PORT_INIT)
    }
    this.instanceKey = `${data.wsUrl}::${data.dbName}`

    const instances = WorkerPort.instances
    const activeClients = WorkerPort.activeInstanceClients

    if (!instances.has(this.instanceKey)) {
      instances.set(this.instanceKey, this)
      activeClients.set(this.instanceKey, 1)
    } else {
      activeClients.set(
        this.instanceKey,
        (activeClients.get(this.instanceKey) ?? 0) + 1
      )
    }
  }

  public handleMessage(event: MessageEvent) {
    try {
      const message = event.data as UpstreamWorkerMessage<unknown>
      if (!message || typeof message.type !== 'string') {
        throw new Error('Malformed message')
      }
      switch (message.type) {
        case UpstreamWorkerMessageType.Init:
          this.init((message as UpstreamWorkerMessage<InstanceData>).data)
          break
        case UpstreamWorkerMessageType.Ping:
          // No operation for ping
          break
        case UpstreamWorkerMessageType.Transition:
          // No operation for transition
          break
        default:
          throw new Error(`Unknown message type: ${message.type}`)
      }
    } catch (error) {
      console.error(error)
    }
  }
}

export const portManager = {
  init() {
    const context = self as unknown as SharedWorkerGlobalScope
    context.onconnect = (event: MessageEvent) => {
      const ports = (event as MessageEvent).ports
      if (!ports || ports.length === 0) {
        throw new NoPortsError()
      }
      const port = ports[0]
      const workerPort = new WorkerPort(port)
      port.onmessage = workerPort.handleMessage.bind(workerPort)
      port.onmessageerror = (errorEvent: MessageEvent) => {
        console.error(errorEvent)
      }
    }
  }
}

export {
  WorkerPort as __testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort
}