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

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('workerEntrypoint', () => {
    it('should set globalThis.onmessage and onmessageerror handlers', () => {
      const originalOnMessage = globalThis.onmessage;
      const originalOnMessageError = globalThis.onmessageerror;
      workerEntrypoint();
      expect(typeof globalThis.onmessage).toBe('function');
      expect(typeof globalThis.onmessageerror).toBe('function');
      globalThis.onmessage = originalOnMessage;
      globalThis.onmessageerror = originalOnMessageError;
    });

    it('should handle malformed messages without throwing', () => {
      workerEntrypoint();
      const handler = globalThis.onmessage!;
      expect(() => handler({} as any)).not.toThrow();
      expect(() => handler({ data: null } as any)).not.toThrow();
      expect(() => handler({ data: { foo: 'bar' } } as any)).not.toThrow();
    });
  });
}