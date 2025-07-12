import { UpstreamWorkerMessageType } from '../../../../types/messages/worker/UpstreamWorkerMessage';
import { WorkerLocalFirst } from '../../helpers/worker_thread';

export function workerEntrypoint(): void {
  const localFirst = new WorkerLocalFirst();

  globalThis.onmessage = (event: MessageEvent) => {
    const message = event.data;
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return;
    }
    const { type, data } = message as { type: UpstreamWorkerMessageType; data?: unknown };
    switch (type) {
      case UpstreamWorkerMessageType.Init:
        localFirst.init(data as { wsUrl: string; dbName: string });
        break;
      case UpstreamWorkerMessageType.Ping:
        console.error("main thread tried to ping worker even though it isn't a SharedWorker!");
        break;
      case UpstreamWorkerMessageType.Transition:
      default:
        break;
    }
  };

  globalThis.onmessageerror = (event: MessageEvent) => {
    console.error('Message error!');
    console.error(event.data);
  };
}