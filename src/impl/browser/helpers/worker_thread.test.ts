import { interpret } from 'xstate';
import type { Actor } from 'xstate';
import { clientMachine } from '../machines/worker';

export class WorkerLocalFirst {
  public readonly machine: Actor<typeof clientMachine>;

  constructor() {
    this.machine = interpret(clientMachine).start();
  }

  init(params?: { wsUrl?: string; dbName?: string } | null): void {
    const { wsUrl, dbName } = (params ?? {}) as { wsUrl?: string; dbName?: string };
    this.machine.send({ type: 'init', wsUrl, dbName });
  }

  [Symbol.dispose](): void {
    this.machine.stop();
  }
}