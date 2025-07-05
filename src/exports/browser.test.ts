import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserLocalFirst } from './browser'
import { DB_NAME, SOCKET_URL } from '../testing/constants'
import {
	type UpstreamWorkerMessage,
	UpstreamWorkerMessageType
} from '../types/messages/worker/UpstreamWorkerMessage'
import type { TestingTransition } from '../testing/transitions'
import { TransitionImpact } from '../types/transitions/Transition'

describe('BrowserLocalFirst', () => {
	describe('Worker', () => {
		describe('message posting via .postMessage()', () => {
			let mockWorker: Worker
			beforeEach(() => {
				mockWorker = {
					postMessage: vi.fn()
				} as unknown as Worker
			})

			it('inits', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.postMessage).toHaveBeenCalledExactlyOnceWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: SOCKET_URL
					}
				} satisfies UpstreamWorkerMessage<TestingTransition>)
			})
			it('sends transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					}
				})
			})
		})
	})
	describe('SharedWorker', () => {
		describe('message posting via .port.postMessage()', () => {
			type TestingSharedWorker = SharedWorker & {
				postMessage: Worker['postMessage']
			}
			let mockWorker: TestingSharedWorker
			beforeEach(() => {
				mockWorker = {
					port: { postMessage: vi.fn() },
					postMessage: vi.fn()
				} as unknown as TestingSharedWorker
			})

			it('inits', () => {
				new BrowserLocalFirst({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})

				expect(mockWorker.port.postMessage).toHaveBeenCalledExactlyOnceWith({
					type: UpstreamWorkerMessageType.Init,
					data: {
						dbName: DB_NAME,
						wsUrl: SOCKET_URL
					}
				} satisfies UpstreamWorkerMessage<TestingTransition>)
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(0)
			})
			it('sends transitions', () => {
				const syncEngine = new BrowserLocalFirst<TestingTransition>({
					dbName: DB_NAME,
					wsUrl: SOCKET_URL,
					worker: mockWorker
				})
				syncEngine.transition({
					action: 'shift_foo_bar',
					impact: TransitionImpact.LocalOnly
				})

				expect(mockWorker.port.postMessage).toHaveBeenLastCalledWith({
					type: UpstreamWorkerMessageType.Transition,
					data: {
						action: 'shift_foo_bar',
						impact: TransitionImpact.LocalOnly
					}
				})
				expect(mockWorker.postMessage).toHaveBeenCalledTimes(0)
			})
		})
	})
})
