import { interpret } from 'xstate';
import type { Actor } from 'xstate';
import { clientMachine } from '../machines/worker';
import { describe, it, expect, vi } from 'vitest';

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

describe('WorkerLocalFirst', () => {
  it('should create an instance with a running machine', () => {
    const instance = new WorkerLocalFirst();
    expect(instance).toBeInstanceOf(WorkerLocalFirst);
    expect(typeof instance.machine.send).toBe('function');
    instance[Symbol.dispose]();
  });

  it('init sends the correct init event', () => {
    const instance = new WorkerLocalFirst();
    const sendSpy = vi.spyOn(instance.machine, 'send');
    instance.init({ wsUrl: 'ws://localhost', dbName: 'testdb' });
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'init',
      wsUrl: 'ws://localhost',
      dbName: 'testdb'
    });
    instance[Symbol.dispose]();
  });

  it('init with null or undefined params still sends init with undefined values', () => {
    const instance = new WorkerLocalFirst();
    const sendSpy = vi.spyOn(instance.machine, 'send');
    instance.init(null);
    expect(sendSpy).toHaveBeenCalledWith({ type: 'init', wsUrl: undefined, dbName: undefined });
    instance.init();
    expect(sendSpy).toHaveBeenCalledWith({ type: 'init', wsUrl: undefined, dbName: undefined });
    instance[Symbol.dispose]();
  });
});