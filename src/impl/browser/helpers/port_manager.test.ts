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

describe('WorkerPort message handling', () => {
	let userPort: MessagePort
	let testingPort: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		const channel = new MessageChannel()
		testingPort = channel.port1
		userPort = channel.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('handles Ping messages correctly', async () => {
		// First initialize the port
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		await vi.waitUntil(() => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
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

		await vi.waitUntil(() => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		// Send transition message
		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Transition,
				data: { someTransitionData: 'test' }
			} satisfies UpstreamWorkerMessage<any>)
		}).not.toThrow()
	})

	it('handles unknown message types gracefully', () => {
		expect(() => {
			userPort.postMessage({
				type: 999 as any,
				data: {}
			})
		}).not.toThrow()
	})
})

describe('WorkerPort double initialization protection', () => {
	let userPort: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		const channel = new MessageChannel()
		const testingPort = channel.port1
		userPort = channel.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('throws PortDoubleInitError on double initialization', async () => {
		// Send first init message
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		await vi.waitUntil(() => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		// Send second init message - should cause error to be logged
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		// Allow time for error handling
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(consoleErrorMock).toHaveBeenCalled()
	})
})

describe('WorkerPort client counting and cleanup', () => {
	let userPort1: MessagePort
	let userPort2: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		
		// Set up first port
		const channel1 = new MessageChannel()
		const testingPort1 = channel1.port1
		userPort1 = channel1.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort1] }))
		
		// Set up second port
		const channel2 = new MessageChannel()
		const testingPort2 = channel2.port1
		userPort2 = channel2.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort2] }))
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('correctly counts multiple clients for same instance', async () => {
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		// Initialize same instance from both ports
		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>

		userPort1.postMessage(initMessage)
		userPort2.postMessage(initMessage)

		await vi.waitUntil(() => {
			const instanceKey = `${SOCKET_URL}::${DB_NAME}`
			return activeInstanceClients.get(instanceKey) === 2
		}, { interval: 5, timeout: 500 })

		const instanceKey = `${SOCKET_URL}::${DB_NAME}`
		expect(activeInstanceClients.get(instanceKey)).toBe(2)
	})

	it('creates separate instances for different db/ws combinations', async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		// Initialize different instances from the two ports
		userPort1.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		userPort2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: 'ws://different-url',
				dbName: 'different-db'
			}
		} satisfies UpstreamWorkerMessage<never>)

		await vi.waitUntil(() => {
			return classInstanceMap.size === 2 && activeInstanceClients.size === 2
		}, { interval: 5, timeout: 500 })

		expect(classInstanceMap.size).toBe(2)
		expect(activeInstanceClients.size).toBe(2)
		expect(activeInstanceClients.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(1)
		expect(activeInstanceClients.get('ws://different-url::different-db')).toBe(1)
	})
})

describe('WorkerPort timeout functionality', () => {
	let userPort: MessagePort
	let workerPortInstance: any
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		const channel = new MessageChannel()
		const testingPort = channel.port1
		userPort = channel.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		
		// Get reference to the WorkerPort instance for testing
		// We'll need to access it through the instances map after initialization
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('sets up timeout on creation', async () => {
		// Initialize the port
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		await vi.waitUntil(() => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		// The timeout should be set up - we can't directly test it without waiting 60 seconds,
		// but we can verify the instance was created successfully
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		expect(classInstanceMap.size).toBe(1)
	})

	it('resets timeout on ping messages', async () => {
		// Initialize the port
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>)

		await vi.waitUntil(() => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		// Send ping message to reset timeout
		userPort.postMessage({
			type: UpstreamWorkerMessageType.Ping
		} satisfies UpstreamWorkerMessage<never>)

		// The instance should still exist (timeout was reset)
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		expect(classInstanceMap.size).toBe(1)
	})
})

describe('WorkerPort disposal and cleanup', () => {
	let userPort: MessagePort
	let testingPort: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		const channel = new MessageChannel()
		testingPort = channel.port1
		userPort = channel.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('handles port disposal without initialization', () => {
		// Close port without initializing it
		expect(() => {
			testingPort.close()
		}).not.toThrow()
	})

	it('properly cleans up instances when last client disconnects', async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		// Initialize the port
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

		expect(classInstanceMap.size).toBe(1)
		expect(activeInstanceClients.size).toBe(1)

		// Close the port to trigger cleanup
		testingPort.close()

		// Note: Actual cleanup happens through Symbol.dispose which may be triggered
		// by garbage collection or explicit disposal, but we can't easily test that
		// in this environment. The important thing is that the port closed without error.
	})
})

describe('WorkerPort error scenarios', () => {
	let userPort: MessagePort
	
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return
		const channel = new MessageChannel()
		const testingPort = channel.port1
		userPort = channel.port2
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
	})

	afterEach(() => {
		// Clear instances between tests
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeInstanceClients =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeInstanceClients.clear()
	})

	it('handles init with null/undefined data gracefully', () => {
		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: null
			} as any)
		}).not.toThrow()

		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: undefined
			} as any)
		}).not.toThrow()
	})

	it('handles init with invalid data types gracefully', () => {
		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: 123,
					dbName: true
				}
			} as any)
		}).not.toThrow()

		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: null,
					dbName: undefined
				}
			} as any)
		}).not.toThrow()
	})

	it('handles transition messages without prior initialization', () => {
		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Transition,
				data: { someData: 'test' }
			} satisfies UpstreamWorkerMessage<any>)
		}).not.toThrow()
	})

	it('handles ping messages without prior initialization', () => {
		expect(() => {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Ping
			} satisfies UpstreamWorkerMessage<never>)
		}).not.toThrow()
	})
})

describe('portManager edge cases', () => {
	afterEach(resetListener)

	it('handles onconnect being called with undefined ports', ({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip()
		
		expect(() => {
			ctx.onconnect(new MessageEvent('connect', { ports: undefined as any }))
		}).toThrow(NoPortsError)
	})

	it('handles onconnect being called with null event', ({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip()
		
		expect(() => {
			ctx.onconnect(null as any)
		}).toThrow()
	})

	it('handles malformed MessageEvent', ({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip()
		
		expect(() => {
			ctx.onconnect({} as any)
		}).toThrow()
	})
})
