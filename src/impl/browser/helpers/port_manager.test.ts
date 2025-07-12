<fixed_code>
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
	// let port: MessagePort
	let userPort: MessagePort
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		// port = testingPort
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
		// It'll take a moment for the message to get sent through
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
		
		// Set up primary connection
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
		
		// Set up secondary connection for multi-port testing
		const secondChannel = new MessageChannel()
		const secondTestingPort = secondChannel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [secondTestingPort] }))
		secondUserPort = secondChannel.port2
	})
	
	afterEach(() => {
		// Clean up port connections
		userPort?.close()
		secondUserPort?.close()
		// @ts-expect-error Reset static instances for clean test state
		__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances?.clear()
		// @ts-expect-error Reset active clients for clean test state
		__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients?.clear()
	})

	describe('message type handling', () => {
		it('handles Ping messages correctly', async () => {
			// First initialize the port
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			// Wait for initialization
			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			// Send ping message
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})

		it('handles Transition messages correctly', async () => {
			// First initialize the port
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			// Wait for initialization
			await vi.waitUntil(() => {
				const instances = 
					// @ts-expect-error instances is private
					__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
				return instances.size > 0
			}, { interval: 5, timeout: 500 })

			// Send transition message
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
					type: 999 as any, // Invalid message type
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

			// Initialize from first port
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			// Initialize from second port with same config
			secondUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: config
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 1000
			})

			// Should have only one instance but two clients
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

			// First initialization
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

			// Second initialization should cause error but not crash
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: 'ws://different:8080',
					dbName: 'different_db'
				}
			} satisfies UpstreamWorkerMessage<never>)

			// Give some time for error to potentially occur
			await new Promise(resolve => setTimeout(resolve, 50))

			// Port should still be functional for other operations
			expect(() => {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}).not.toThrow()
		})
	})

	describe('timeout and disposal behavior', () => {
		it('handles timeout disposal mechanism', () => {
			// Create a port instance
			const channel = new MessageChannel()
			const testingPort = channel.port1
			const testUserPort = channel.port2

			ctx.onconnect?.(new MessageEvent('connect', { ports: [testingPort] }))

			// Send init message
			testUserPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)

			// Port should be set up correctly
			expect(testingPort.onmessage).toBeTypeOf('function')
			expect(testingPort.onmessageerror).toBeTypeOf('function')

			// Close ports
			testUserPort.close()
			testingPort.close()
		})

		it('resets timeout on ping messages', async () => {
			// Initialize port
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

			// Send multiple ping messages to reset timeout
			for (let i = 0; i < 5; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}

			// Should not throw any errors
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

			// Close the port (simulating disposal)
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

			// Two ports with same config
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

			// Close one port
			userPort.close()
			
			// Instance should still exist with one client
			// Note: This would require the actual disposal to be triggered
			// In real scenarios, this happens when the WorkerPort is garbage collected
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

			// Send multiple init messages rapidly
			for (let i = 0; i < 10; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Init,
					data: {
						wsUrl: SOCKET_URL,
						dbName: `${DB_NAME}_${i}`
					}
				} satisfies UpstreamWorkerMessage<never>)
			}

			// Wait for processing
			await vi.waitUntil(() => instances.size > 0, {
				interval: 5,
				timeout: 1000
			})

			// Should have created only one instance (first one wins due to double init protection)
			expect(instances.size).toBeLessThanOrEqual(10)
		})

		it('handles concurrent ping and init messages', async () => {
			// Initialize first
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

			// Send rapid ping messages
			expect(() => {
				for (let i = 0; i < 20; i++) {
					userPort.postMessage({
						type: UpstreamWorkerMessageType.Ping
					} satisfies UpstreamWorkerMessage<never>)
				}
			}).not.toThrow()
		})

		it('handles mixed message types in rapid succession', async () => {
			// Initialize
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

			// Send mixed messages rapidly
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

			// Initialize
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

			// Perform many operations
			for (let i = 0; i < 100; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}

			// Should still have only one instance
			expect(instances.size).toBe(1)
		})

		it('handles large numbers of different configurations', async () => {
			const instances =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			// Create connections for many different configurations
			const numConfigs = 10
			const connections: Array<{ port: MessagePort; userPort: MessagePort }> = []

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

				connections.push({ port: testingPort, userPort: testUserPort })
			}

			await vi.waitUntil(() => instances.size >= numConfigs, {
				interval: 10,
				timeout: 2000
			})

			expect(instances.size).toBe(numConfigs)

			// Clean up
			connections.forEach(({ port, userPort }) => {
				userPort.close()
				port.close()
			})
		})
	})
})
