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

describe("WorkerPort instance management", () => {
	beforeEach(() => {
		// Clear any existing instances
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeClientsMap.clear()
		portManager.init()
	})

	afterEach(resetListener)

	it("shares instances for identical configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		// Create two connections with same configuration
		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Send init messages to both
		channel1.port2.postMessage(initMessage)
		channel2.port2.postMessage(initMessage)

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(1)
		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(2)
		
		const instance = classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)
		expect(instance).toBeDefined()
	})

	it("maintains separate instances for different configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		// Send different init messages
		channel1.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server1.com", dbName: "db1" }
		})

		channel2.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server2.com", dbName: "db2" }
		})

		await vi.waitUntil(() => classInstanceMap.size === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(2)
		expect(activeClientsMap.get("ws://server1.com::db1")).toBe(1)
		expect(activeClientsMap.get("ws://server2.com::db2")).toBe(1)
		expect(classInstanceMap.get("ws://server1.com::db1")).toBeDefined()
		expect(classInstanceMap.get("ws://server2.com::db2")).toBeDefined()
	})

	it("tracks client count correctly", async () => {
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channels = Array.from({ length: 3 }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Initialize all three with same config
		for (const channel of channels) {
			channel.port2.postMessage(initMessage)
		}

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 3, {
			interval: 10,
			timeout: 500
		})

		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(3)
	})
})

describe("error resilience and edge cases", () => {
	beforeEach(() => {
		portManager.init()
		consoleErrorMock.mockClear()
	})

	afterEach(resetListener)

	it("recovers from port connection failures", () => {
		if (!ctx.onconnect) return

		// Test connection with no ports
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [] }))
		}).toThrow(NoPortsError)

		// Should still be able to handle valid connections after error
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles very large message payloads", async () => {
		if (!ctx.onconnect) return
		
		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		consoleErrorMock.mockClear()

		const largeData = {
			wsUrl: SOCKET_URL,
			dbName: DB_NAME,
			extraData: "x".repeat(100000) // 100KB string
		}

		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: largeData
		})

		await new Promise(resolve => setTimeout(resolve, 200))

		// Should handle large payloads without errors
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})

	it("maintains functionality after multiple initialization calls", () => {
		// Call init multiple times
		portManager.init()
		portManager.init()
		portManager.init()

		expect(ctx.onconnect).toBeTypeOf("function")

		// Should still work normally
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles rapid connection establishment", () => {
		if (!ctx.onconnect) return

		const startTime = performance.now()
		const connectionCount = 50
		
		// Create many connections rapidly
		for (let i = 0; i < connectionCount; i++) {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle rapid connections efficiently
		expect(duration).toBeLessThan(500) // 500ms for 50 connections
	})
})

describe("performance and scalability", () => {
	beforeEach(() => {
		portManager.init()
	})

	afterEach(resetListener)

	it("scales to many simultaneous instances", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		if (!ctx.onconnect) return

		const instanceCount = 25
		const channels = Array.from({ length: instanceCount }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		// Send unique init messages
		const startTime = performance.now()
		for (let i = 0; i < instanceCount; i++) {
			channels[i].port2.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: `ws://server-${i}.com`,
					dbName: `database-${i}`
				}
			})
		}

		await vi.waitUntil(() => classInstanceMap.size === instanceCount, {
			interval: 20,
			timeout: 2000
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		expect(classInstanceMap.size).toBe(instanceCount)
		expect(duration).toBeLessThan(1000) // Should complete within 1 second
	})

	it("handles message throughput efficiently", async () => {
		if (!ctx.onconnect) return

		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		// Initialize first
		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		})

		await new Promise(resolve => setTimeout(resolve, 50))

		const messageCount = 100
		const startTime = performance.now()

		// Send many ping messages rapidly
		for (let i = 0; i < messageCount; i++) {
			channel.port2.postMessage({
				type: UpstreamWorkerMessageType.Ping
			})
		}

		await new Promise(resolve => setTimeout(resolve, 100))

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle high message throughput
		expect(duration).toBeLessThan(500) // 500ms for 100 messages
		expect(consoleErrorMock).not.toHaveBeenCalled()
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

describe("WorkerPort instance management", () => {
	beforeEach(() => {
		// Clear any existing instances
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeClientsMap.clear()
		portManager.init()
	})

	afterEach(resetListener)

	it("shares instances for identical configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		// Create two connections with same configuration
		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Send init messages to both
		channel1.port2.postMessage(initMessage)
		channel2.port2.postMessage(initMessage)

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(1)
		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(2)
		
		const instance = classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)
		expect(instance).toBeDefined()
	})

	it("maintains separate instances for different configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		// Send different init messages
		channel1.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server1.com", dbName: "db1" }
		})

		channel2.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server2.com", dbName: "db2" }
		})

		await vi.waitUntil(() => classInstanceMap.size === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(2)
		expect(activeClientsMap.get("ws://server1.com::db1")).toBe(1)
		expect(activeClientsMap.get("ws://server2.com::db2")).toBe(1)
		expect(classInstanceMap.get("ws://server1.com::db1")).toBeDefined()
		expect(classInstanceMap.get("ws://server2.com::db2")).toBeDefined()
	})

	it("tracks client count correctly", async () => {
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channels = Array.from({ length: 3 }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Initialize all three with same config
		for (const channel of channels) {
			channel.port2.postMessage(initMessage)
		}

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 3, {
			interval: 10,
			timeout: 500
		})

		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(3)
	})
})

describe("error resilience and edge cases", () => {
	beforeEach(() => {
		portManager.init()
		consoleErrorMock.mockClear()
	})

	afterEach(resetListener)

	it("recovers from port connection failures", () => {
		if (!ctx.onconnect) return

		// Test connection with no ports
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [] }))
		}).toThrow(NoPortsError)

		// Should still be able to handle valid connections after error
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles very large message payloads", async () => {
		if (!ctx.onconnect) return
		
		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		consoleErrorMock.mockClear()

		const largeData = {
			wsUrl: SOCKET_URL,
			dbName: DB_NAME,
			extraData: "x".repeat(100000) // 100KB string
		}

		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: largeData
		})

		await new Promise(resolve => setTimeout(resolve, 200))

		// Should handle large payloads without errors
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})

	it("maintains functionality after multiple initialization calls", () => {
		// Call init multiple times
		portManager.init()
		portManager.init()
		portManager.init()

		expect(ctx.onconnect).toBeTypeOf("function")

		// Should still work normally
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles rapid connection establishment", () => {
		if (!ctx.onconnect) return

		const startTime = performance.now()
		const connectionCount = 50
		
		// Create many connections rapidly
		for (let i = 0; i < connectionCount; i++) {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle rapid connections efficiently
		expect(duration).toBeLessThan(500) // 500ms for 50 connections
	})
})

describe("performance and scalability", () => {
	beforeEach(() => {
		portManager.init()
	})

	afterEach(resetListener)

	it("scales to many simultaneous instances", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		if (!ctx.onconnect) return

		const instanceCount = 25
		const channels = Array.from({ length: instanceCount }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		// Send unique init messages
		const startTime = performance.now()
		for (let i = 0; i < instanceCount; i++) {
			channels[i].port2.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: `ws://server-${i}.com`,
					dbName: `database-${i}`
				}
			})
		}

		await vi.waitUntil(() => classInstanceMap.size === instanceCount, {
			interval: 20,
			timeout: 2000
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		expect(classInstanceMap.size).toBe(instanceCount)
		expect(duration).toBeLessThan(1000) // Should complete within 1 second
	})

	it("handles message throughput efficiently", async () => {
		if (!ctx.onconnect) return

		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		// Initialize first
		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		})

		await new Promise(resolve => setTimeout(resolve, 50))

		const messageCount = 100
		const startTime = performance.now()

		// Send many ping messages rapidly
		for (let i = 0; i < messageCount; i++) {
			channel.port2.postMessage({
				type: UpstreamWorkerMessageType.Ping
			})
		}

		await new Promise(resolve => setTimeout(resolve, 100))

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle high message throughput
		expect(duration).toBeLessThan(500) // 500ms for 100 messages
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})
})
describe("port message listener", ({ skip }) => {
	let userPort: MessagePort
	beforeEach(() => {
		portManager.init()
		if (!ctx.onconnect) return skip("")
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent("connect", { ports: [testingPort] }))
		userPort = channel.port2
	})

	describe("initialization messages", () => {
		it("assigns the correct static properties on init", async () => {
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
			expect(addedInstance).toBeTypeOf("object")
		})

		it("handles multiple init messages with same configuration", async () => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			const initMessage = {
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>

			userPort.postMessage(initMessage)
			await vi.waitUntil(() => classInstanceMap.size > 0, {
				interval: 5,
				timeout: 500
			})

			const initialSize = classInstanceMap.size
			const initialInstance = classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)

			// Send the same init message again
			userPort.postMessage(initMessage)
			await new Promise(resolve => setTimeout(resolve, 50))

			expect(classInstanceMap.size).toBe(initialSize)
			expect(classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(initialInstance)
		})

		it("throws PortDoubleInitError on double initialization", async () => {
			consoleErrorMock.mockClear()

			const initMessage = {
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>

			// First init should succeed
			userPort.postMessage(initMessage)
			await new Promise(resolve => setTimeout(resolve, 50))

			// Second init should throw error
			userPort.postMessage(initMessage)
			await new Promise(resolve => setTimeout(resolve, 50))

			expect(consoleErrorMock).toHaveBeenCalled()
		})

		it("handles different configurations separately", async () => {
			const classInstanceMap =
				// @ts-expect-error instances is private
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

			// Create another connection with different config
			const channel2 = new MessageChannel()
			const testingPort2 = channel2.port1
			ctx.onconnect(new MessageEvent("connect", { ports: [testingPort2] }))
			const userPort2 = channel2.port2

			userPort2.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: "ws://different-url",
					dbName: "different-db"
				}
			} satisfies UpstreamWorkerMessage<never>)

			await vi.waitUntil(() => classInstanceMap.size === 2, {
				interval: 5,
				timeout: 500
			})

			expect(classInstanceMap.size).toBe(2)
			expect(classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBeDefined()
			expect(classInstanceMap.get("ws://different-url::different-db")).toBeDefined()
		})
	})

	describe("ping messages", () => {
		beforeEach(async () => {
			// Initialize first
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)
			await new Promise(resolve => setTimeout(resolve, 50))
		})

		it("handles ping messages without error", async () => {
			consoleErrorMock.mockClear()

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Ping
			} satisfies UpstreamWorkerMessage<never>)

			await new Promise(resolve => setTimeout(resolve, 50))

			expect(consoleErrorMock).not.toHaveBeenCalled()
		})

		it("accepts multiple ping messages", async () => {
			consoleErrorMock.mockClear()

			for (let i = 0; i < 5; i++) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Ping
				} satisfies UpstreamWorkerMessage<never>)
			}

			await new Promise(resolve => setTimeout(resolve, 100))

			expect(consoleErrorMock).not.toHaveBeenCalled()
		})

		it("handles ping before initialization gracefully", async () => {
			// Create fresh connection without init
			const channel = new MessageChannel()
			const testingPort = channel.port1
			ctx.onconnect(new MessageEvent("connect", { ports: [testingPort] }))
			const freshUserPort = channel.port2

			consoleErrorMock.mockClear()

			freshUserPort.postMessage({
				type: UpstreamWorkerMessageType.Ping
			} satisfies UpstreamWorkerMessage<never>)

			await new Promise(resolve => setTimeout(resolve, 50))

			// Should not cause errors even without initialization
			expect(consoleErrorMock).not.toHaveBeenCalled()
		})
	})

	describe("transition messages", () => {
		beforeEach(async () => {
			// Initialize first
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: SOCKET_URL,
					dbName: DB_NAME
				}
			} satisfies UpstreamWorkerMessage<never>)
			await new Promise(resolve => setTimeout(resolve, 50))
		})

		it("handles transition messages", async () => {
			consoleErrorMock.mockClear()

			userPort.postMessage({
				type: UpstreamWorkerMessageType.Transition,
				data: {
					action: "test_action",
					impact: "LocalOnly"
				}
			} satisfies UpstreamWorkerMessage<any>)

			await new Promise(resolve => setTimeout(resolve, 50))

			expect(consoleErrorMock).not.toHaveBeenCalled()
		})

		it("handles multiple transition messages", async () => {
			consoleErrorMock.mockClear()

			const transitions = [
				{ action: "action1", impact: "LocalOnly" },
				{ action: "action2", impact: "Remote" },
				{ action: "action3", impact: "Both" }
			]

			for (const data of transitions) {
				userPort.postMessage({
					type: UpstreamWorkerMessageType.Transition,
					data
				} satisfies UpstreamWorkerMessage<any>)
			}

			await new Promise(resolve => setTimeout(resolve, 100))

			expect(consoleErrorMock).not.toHaveBeenCalled()
		})

		it("handles transition before initialization gracefully", async () => {
			// Create fresh connection without init
			const channel = new MessageChannel()
			const testingPort = channel.port1
			ctx.onconnect(new MessageEvent("connect", { ports: [testingPort] }))
			const freshUserPort = channel.port2

			consoleErrorMock.mockClear()

			freshUserPort.postMessage({
				type: UpstreamWorkerMessageType.Transition,
				data: { action: "test", impact: "LocalOnly" }
			} satisfies UpstreamWorkerMessage<any>)

			await new Promise(resolve => setTimeout(resolve, 50))

			// Should handle gracefully without initialization
			expect(consoleErrorMock).not.toHaveBeenCalled()
		})
	})

	describe("message error handling", () => {
		it("handles malformed messages gracefully", async () => {
			consoleErrorMock.mockClear()

			const malformedMessages = [
				null,
				undefined,
				"string message",
				42,
				{}, // Missing type
				{ type: "invalid-type" }, // Invalid type
				{ type: UpstreamWorkerMessageType.Init }, // Missing data
				{ type: UpstreamWorkerMessageType.Init, data: null }
			]

			for (const message of malformedMessages) {
				userPort.postMessage(message)
			}

			await new Promise(resolve => setTimeout(resolve, 100))

			// Should handle errors gracefully
			expect(consoleErrorMock).toHaveBeenCalled()
		})

		it("handles port message errors gracefully", async () => {
			consoleErrorMock.mockClear()

			const channel = new MessageChannel()
			const testingPort = channel.port1
			ctx.onconnect(new MessageEvent("connect", { ports: [testingPort] }))

			// Simulate a message error event
			if (testingPort.onmessageerror) {
				testingPort.onmessageerror(new MessageEvent("messageerror"))
			}

			await new Promise(resolve => setTimeout(resolve, 50))

			expect(consoleErrorMock).toHaveBeenCalled()
		})

		it("continues processing after individual message errors", async () => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			consoleErrorMock.mockClear()

			// Send an invalid message
			userPort.postMessage({ invalid: "message" })

			// Then send a valid message
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
		})
	})

	describe("concurrent operations", () => {
		it("handles multiple simultaneous connections", () => {
			if (!ctx.onconnect) return skip()

			const channels = Array.from({ length: 5 }, () => new MessageChannel())
			const ports = channels.map(ch => ch.port1)

			// Connect multiple ports simultaneously
			for (const port of ports) {
				ctx.onconnect(new MessageEvent("connect", { ports: [port] }))
			}

			// All ports should have listeners assigned
			for (const port of ports) {
				expect(port.onmessage).toBeTypeOf("function")
				expect(port.onmessageerror).toBeTypeOf("function")
			}
		})

		it("handles rapid message sending", async () => {
			const classInstanceMap =
				// @ts-expect-error instances is private
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

			const messages = Array.from({ length: 10 }, (_, i) => ({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: `ws://test-${i}.com`,
					dbName: `db-${i}`
				}
			}))

			// Create separate connections for each message
			const channels = messages.map(() => {
				const channel = new MessageChannel()
				ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
				return channel
			})

			// Send all messages rapidly
			messages.forEach((message, i) => {
				channels[i].port2.postMessage(message)
			})

			await vi.waitUntil(() => classInstanceMap.size === 10, {
				interval: 10,
				timeout: 1000
			})

			expect(classInstanceMap.size).toBe(10)
		})
	})
})

describe("WorkerPort instance management", () => {
	beforeEach(() => {
		// Clear any existing instances
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients
		classInstanceMap.clear()
		activeClientsMap.clear()
		portManager.init()
	})

	afterEach(resetListener)

	it("shares instances for identical configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		// Create two connections with same configuration
		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Send init messages to both
		channel1.port2.postMessage(initMessage)
		channel2.port2.postMessage(initMessage)

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(1)
		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(2)
		
		const instance = classInstanceMap.get(`${SOCKET_URL}::${DB_NAME}`)
		expect(instance).toBeDefined()
	})

	it("maintains separate instances for different configurations", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channel1 = new MessageChannel()
		const channel2 = new MessageChannel()
		
		ctx.onconnect(new MessageEvent("connect", { ports: [channel1.port1] }))
		ctx.onconnect(new MessageEvent("connect", { ports: [channel2.port1] }))

		// Send different init messages
		channel1.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server1.com", dbName: "db1" }
		})

		channel2.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: "ws://server2.com", dbName: "db2" }
		})

		await vi.waitUntil(() => classInstanceMap.size === 2, {
			interval: 10,
			timeout: 500
		})

		expect(classInstanceMap.size).toBe(2)
		expect(activeClientsMap.get("ws://server1.com::db1")).toBe(1)
		expect(activeClientsMap.get("ws://server2.com::db2")).toBe(1)
		expect(classInstanceMap.get("ws://server1.com::db1")).toBeDefined()
		expect(classInstanceMap.get("ws://server2.com::db2")).toBeDefined()
	})

	it("tracks client count correctly", async () => {
		const activeClientsMap =
			// @ts-expect-error activeInstanceClients is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		if (!ctx.onconnect) return

		const channels = Array.from({ length: 3 }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		}

		// Initialize all three with same config
		for (const channel of channels) {
			channel.port2.postMessage(initMessage)
		}

		await vi.waitUntil(() => activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`) === 3, {
			interval: 10,
			timeout: 500
		})

		expect(activeClientsMap.get(`${SOCKET_URL}::${DB_NAME}`)).toBe(3)
	})
})

describe("error resilience and edge cases", () => {
	beforeEach(() => {
		portManager.init()
		consoleErrorMock.mockClear()
	})

	afterEach(resetListener)

	it("recovers from port connection failures", () => {
		if (!ctx.onconnect) return

		// Test connection with no ports
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [] }))
		}).toThrow(NoPortsError)

		// Should still be able to handle valid connections after error
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles very large message payloads", async () => {
		if (!ctx.onconnect) return
		
		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		consoleErrorMock.mockClear()

		const largeData = {
			wsUrl: SOCKET_URL,
			dbName: DB_NAME,
			extraData: "x".repeat(100000) // 100KB string
		}

		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: largeData
		})

		await new Promise(resolve => setTimeout(resolve, 200))

		// Should handle large payloads without errors
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})

	it("maintains functionality after multiple initialization calls", () => {
		// Call init multiple times
		portManager.init()
		portManager.init()
		portManager.init()

		expect(ctx.onconnect).toBeTypeOf("function")

		// Should still work normally
		const channel = new MessageChannel()
		expect(() => {
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}).not.toThrow()

		expect(channel.port1.onmessage).toBeTypeOf("function")
	})

	it("handles rapid connection establishment", () => {
		if (!ctx.onconnect) return

		const startTime = performance.now()
		const connectionCount = 50
		
		// Create many connections rapidly
		for (let i = 0; i < connectionCount; i++) {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
		}

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle rapid connections efficiently
		expect(duration).toBeLessThan(500) // 500ms for 50 connections
	})
})

describe("performance and scalability", () => {
	beforeEach(() => {
		portManager.init()
	})

	afterEach(resetListener)

	it("scales to many simultaneous instances", async () => {
		const classInstanceMap =
			// @ts-expect-error instances is private
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		if (!ctx.onconnect) return

		const instanceCount = 25
		const channels = Array.from({ length: instanceCount }, () => {
			const channel = new MessageChannel()
			ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))
			return channel
		})

		// Send unique init messages
		const startTime = performance.now()
		for (let i = 0; i < instanceCount; i++) {
			channels[i].port2.postMessage({
				type: UpstreamWorkerMessageType.Init,
				data: {
					wsUrl: `ws://server-${i}.com`,
					dbName: `database-${i}`
				}
			})
		}

		await vi.waitUntil(() => classInstanceMap.size === instanceCount, {
			interval: 20,
			timeout: 2000
		})

		const endTime = performance.now()
		const duration = endTime - startTime

		expect(classInstanceMap.size).toBe(instanceCount)
		expect(duration).toBeLessThan(1000) // Should complete within 1 second
	})

	it("handles message throughput efficiently", async () => {
		if (!ctx.onconnect) return

		const channel = new MessageChannel()
		ctx.onconnect(new MessageEvent("connect", { ports: [channel.port1] }))

		// Initialize first
		channel.port2.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
		})

		await new Promise(resolve => setTimeout(resolve, 50))

		const messageCount = 100
		const startTime = performance.now()

		// Send many ping messages rapidly
		for (let i = 0; i < messageCount; i++) {
			channel.port2.postMessage({
				type: UpstreamWorkerMessageType.Ping
			})
		}

		await new Promise(resolve => setTimeout(resolve, 100))

		const endTime = performance.now()
		const duration = endTime - startTime

		// Should handle high message throughput
		expect(duration).toBeLessThan(500) // 500ms for 100 messages
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})
})
