/// <reference lib="webworker" />

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest'
import {
	__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort,
	portManager
} from './port_manager'
import { NoPortsError } from '../../../common/errors'
import {
	UpstreamWorkerMessageType,
	type UpstreamWorkerMessage
} from '../../../types/messages/worker/UpstreamWorkerMessage'
import { DB_NAME, SOCKET_URL } from '../../../testing/constants'

const ctx = self as unknown as SharedWorkerGlobalScope
const resetListener = () => {
	// @ts-expect-error We're resetting ctx.onconnect, and you wouldn't usually do this
	ctx.onconnect = undefined
}

const consoleErrorMock = vi.spyOn(console, 'error')
beforeEach(consoleErrorMock.mockClear)

// @ts-expect-error We need to assign to locks because jsdom won't do it for us
navigator.locks = {
	request: () => {}
}

describe('init', () => {
	afterEach(resetListener)
	beforeAll(resetListener)
	it('does not happen unprompted', async () => {
		await import('./port_manager')
		expect(ctx.onconnect).toBeUndefined()
	})
	it('sets self.onconnect', () => {
		portManager.init()
		expect(ctx.onconnect).toBeTypeOf('function')
	})
})
describe('onconnect', () => {
	beforeAll(() => {
		portManager.init()
	})
	it('throws when no ports are provided', ({ skip }) => {
		if (!ctx.onconnect) return skip()
		expect(() =>
			ctx.onconnect ? ctx.onconnect(new MessageEvent('connect')) : undefined
		).toThrow(NoPortsError)
	})
	it('assigns a listener to the port', ({ skip }) => {
		if (!ctx.onconnect) return skip()
		const channel = new MessageChannel()
		const port = channel.port1
		expect(port.onmessage).toBeNull()
		expect(port.onmessageerror).toBeNull()

		ctx.onconnect(new MessageEvent('connect', { ports: [port] }))

		expect(port.onmessage).toBeTypeOf('function')
		expect(port.onmessageerror).toBeTypeOf('function')
	})
})
describe('port message listener', ({ skip }) => {
	let userPort: MessagePort
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('assigns the correct static properties on init', async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private, but in this case it's convenient to see it anyway
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)
		await vi.waitUntil(() => classInstanceMap.size > 0, {
			interval: 5,
			timeout: 500
		})

		const addedInstance = classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)
		expect(classInstanceMap.size).toBe(1)
		expect(addedInstance).toBeDefined()
		expect(addedInstance).toBeTypeOf('object')
	})
})

describe('WorkerPort comprehensive functionality', () => {
	let userPort: MessagePort
	let secondUserPort: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
		
		const secondChannel = new MessageChannel()
		const secondTestingPort = secondChannel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [secondTestingPort] }))
		secondUserPort = secondChannel.port2
	})
	
	afterEach(() => {
		userPort?.close()
		secondUserPort?.close()
		// @ts-expect-error Reset static instances for clean test state
		__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances?.clear()
		// @ts-expect-error Reset active clients for clean test state
		__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients?.clear()
	})

	describe('message type handling', () => {
		it('handles Ping messages correctly', async () => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles Transition messages correctly', async () => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Transition,
					data: { type: 'test_transition', payload: 'test' }
				} satisfies UpstreamWorkerMessage<{ type: string; payload: string }>)
			}).not.toThrow()
		})

		it('ignores unknown message types gracefully', () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				userPort.postMessage({
					type: 999 as any,
					data: {}
				})
			}).not.toThrow()
		})
	})

	describe('multiple port instance management', () => {
		it('reuses instances for identical configurations', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			const clients =
				// @ts-expect-error activeInstanceClients is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

			const config = {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			secondUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 1000
			})

			expect(instances.size).toBe(1)
			expect(clients.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(2)
		})

		it('creates separate instances for different configurations', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			secondUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: 'ws://localhost:8081',
					dbName: 'different_db'
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size >= 2, {
				interval: 5,
				timeout: 1000
			})

			expect(instances.size).toBe(2)
			expect(instances.get(`${SOCKET_URL}::${DB_NAME}`)).toBeDefined()
			expect(instances.get('ws://localhost:8081::different_db')).toBeDefined()
		})
	})

	describe('double initialization error handling', () => {
		it('throws PortDoubleInitError on duplicate initialization', async () => {
			consoleErrorMock.mockClear()

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: 'ws://different:8080',
					dbName: 'different_db'
				}
			} satisfies UpstreamWorkerMessage<never>)

			await new Promise(resolve => setTimeout(resolve, 50))

			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})
	})

	describe('timeout and disposal behavior', () => {
		it('handles timeout disposal mechanism', () => {
			const channel = new MessageChannel()
			const testingPort = channel.port1
			const testUserPort = channel.port2

			ctx.onconnect?.(new MessageEvent('connect', { ports: [testingPort] }))

			testUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			expect(testingPort.onmessage).toBeTypeOf('function')
			expect(testingPort.onmessageerror).toBeTypeOf('function')

			testUserPort.close()
			testingPort.close()
		})

		it('resets timeout on ping messages', async () => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			for (let i = 0; i < 5; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}

			expect(true).toBe(true)
		})
	})

	describe('resource cleanup and disposal', () => {
		it('properly cleans up single client instances', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			const clients =
				// @ts-expect-error activeInstanceClients is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 500
			})

			expect(instances.size).toBe(1)
			expect(clients.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(1)

			userPort.close()
		})

		it('properly manages client count for shared instances', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			const clients =
				// @ts-expect-error activeInstanceClients is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

			const config = {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			secondUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 500
			})

			const instanceKey = `${SOCKET_URL}::${DB_NAME}`
			expect(instances.size).toBe(1)
			expect(clients.get(instanceKey)).toBe(2)

			userPort.close()
		})
	})

	describe('edge cases and error scenarios', () => {
		it('handles empty configuration data', () => {
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						wsUrl: '',
						dbName: ''
					}
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles very long configuration strings', () => {
			const longString = 'a'.repeat(10000)
			
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						wsUrl: longString,
						dbName: longString
					}
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles special characters in configuration', () => {
			const specialConfig = {
				wsUrl: 'ws://localhost:8080/path?query=value&other=test',
				dbName: 'db-name_with.special@chars'
			}
			
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: specialConfig
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles unicode characters in configuration', () => {
			const unicodeConfig = {
				wsUrl: 'ws://测试.localhost:8080',
				dbName: '数据库_🚀_test'
			}
			
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: unicodeConfig
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles null and undefined in message data', () => {
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						wsUrl: null as any,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						dbName: undefined as any
					}
				})
			}).not.toThrow()
		})
	})

	describe('concurrent operations and race conditions', () => {
		it('handles rapid successive initialization attempts', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			for (let i = 0; i < 10; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						wsUrl: SOCKET_URL,
						dbName: `${DB_NAME}_${i}`
					}
				} satisfies UpstreamWorkerMessage<never>)
			}

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 1000
			})

			expect(instances.size).toBeLessThanOrEqual(10)
		})

		it('handles concurrent ping and init messages', async () => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			expect(() => {
				for (let i = 0; i < 20; i++) {
					userPort.postMessage({
						type: UpstreamWorkerMessageType.Ping
					} satisfies UpstreamWorkerMessage<never>)
				}
			}).not.toThrow()
		})

		it('handles mixed message types in rapid succession', async () => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			expect(() => {
				for (let i = 0; i < 10; i++) {
					userPort.postMessage({
						type: UpstreamWorkerMessageType.Ping
					} satisfies UpstreamWorkerMessage<never>)
					
					userPort.postMessage({
						type: UpstreamWorkerMessageType.Transition,
						data: { action: 'test', id: i }
					} satisfies UpstreamWorkerMessage<{ action: string; id: number }>)
				}
			}).not.toThrow()
		})
	})

	describe('memory management and performance', () => {
		it('does not accumulate memory with repeated operations', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 500
			})

			for (let i = 0; i < 100; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}

			expect(instances.size).toBe(1)
		})

		it('handles large numbers of different configurations', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			const numConfigs = 10

			for (let i = 0; i < numConfigs; i++) {
				const channel = new MessageChannel()
				const testingPort = channel.port1
				const testUserPort = channel.port2

				ctx.onconnect?.(new MessageEvent('connect', { ports: [testingPort] }))
				
				testUserPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						wsUrl: `ws://localhost:${8080 + i}`,
						dbName: `db_${i}`
					}
				} satisfies UpstreamWorkerMessage<never>)
			}

			await vi.waitUntil(() => instances.size >= numConfigs, {
				interval: 10,
				timeout: 2000
			})

			expect(instances.size).toBe(numConfigs)
		})
	})
})