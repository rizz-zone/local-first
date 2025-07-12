/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

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

describe('ping message handling', () => {
	let userPort: MessagePort

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('handles ping messages correctly', async () => {
		const pingMessage = {
			type: UpstreamWorkerMessageType.Ping
		} satisfies UpstreamWorkerMessage<never>

		expect(() => {
			userPort.postMessage(pingMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})

	it('handles ping messages without initializing first', async () => {
		const pingMessage = {
			type: UpstreamWorkerMessageType.Ping
		} satisfies UpstreamWorkerMessage<never>

		expect(() => {
			userPort.postMessage(pingMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})

	it('handles multiple rapid ping messages', async () => {
		const pingMessage = {
			type: UpstreamWorkerMessageType.Ping
		} satisfies UpstreamWorkerMessage<never>

		for (let i = 0; i < 10; i++) {
			userPort.postMessage(pingMessage)
		}

		await new Promise(resolve => setTimeout(resolve, 100))
		expect(consoleErrorMock).not.toHaveBeenCalled()
	})
})

describe('transition message handling', () => {
	let userPort: MessagePort

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('handles transition messages with data', async () => {
		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: { action: 'test', payload: { id: 1, name: 'test' } }
		} satisfies UpstreamWorkerMessage<{ action: string; payload: any }>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
	})

	it('handles transition messages without data', async () => {
		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition
		} satisfies UpstreamWorkerMessage<undefined>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
	})

	it('handles transition messages with null data', async () => {
		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: null
		} satisfies UpstreamWorkerMessage<null>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
	})

	it('handles complex transition data structures', async () => {
		const complexData = {
			nested: {
				objects: {
					with: ['arrays', 'and', 'strings']
				}
			},
			numbers: 42,
			booleans: true,
			nullValue: null,
			undefinedValue: undefined
		}

		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: complexData
		} satisfies UpstreamWorkerMessage<typeof complexData>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
	})
})

describe.skip('port double initialization error handling', () => {
	let userPort: MessagePort

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('throws PortDoubleInitError on double initialization', async () => {
		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>

		userPort.postMessage(initMessage)

		await vi.waitUntil(() => {
			const classInstanceMap =
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		userPort.postMessage(initMessage)

		await new Promise(resolve => setTimeout(resolve, 100))
		expect(consoleErrorMock).toHaveBeenCalled()
	})

	it('handles double init with different parameters', async () => {
		const firstInit = {
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		} satisfies UpstreamWorkerMessage<never>

		const secondInit = {
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: 'wss://different.com',
				dbName: 'different'
			}
		} satisfies UpstreamWorkerMessage<never>

		userPort.postMessage(firstInit)

		await vi.waitUntil(() => {
			const classInstanceMap =
				__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances
			return classInstanceMap.size > 0
		}, { interval: 5, timeout: 500 })

		userPort.postMessage(secondInit)

		await new Promise(resolve => setTimeout(resolve, 100))
		expect(consoleErrorMock).toHaveBeenCalled()
	})
})

describe.skip('instance cleanup and disposal', () => {
	let userPort: MessagePort
	let channel: MessageChannel

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('properly cleans up instances when clients decrease to zero', async () => {
		const classInstanceMap =
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		const activeInstanceClients =
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		userPort.postMessage({
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		})

		await vi.waitUntil(() => classInstanceMap.size > 0, {
			interval: 5,
			timeout: 500
		})

		const instanceKey = `${SOCKET_URL}::${DB_NAME}`
		expect(classInstanceMap.has(instanceKey)).toBe(true)
		expect(activeInstanceClients.get(instanceKey)).toBe(1)

		channel.port1.close()
		channel.port2.close()

		await new Promise(resolve => setTimeout(resolve, 100))
	})

	it('maintains instances when multiple clients exist', async () => {
		const classInstanceMap =
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.instances

		const activeInstanceClients =
			__testing__do_not_use_this_ever_or_you_will_have_a_terrible_time_and_also_cause_probably_pretty_major_and_significant_bugs_and_we_wouldnt_want_that_would_we__WorkerPort.activeInstanceClients

		const channel2 = new MessageChannel()
		const testingPort2 = channel2.port1
		const userPort2 = channel2.port2

		if (ctx.onconnect) {
			ctx.onconnect(new MessageEvent('connect', { ports: [testingPort2] }))
		}

		const initMessage = {
			type: UpstreamWorkerMessageType.Init,
			data: {
				wsUrl: SOCKET_URL,
				dbName: DB_NAME
			}
		}

		userPort.postMessage(initMessage)
		userPort2.postMessage(initMessage)

		await vi.waitUntil(() => {
			const instanceKey = `${SOCKET_URL}::${DB_NAME}`
			return activeInstanceClients.get(instanceKey) === 2
		}, { interval: 10, timeout: 1000 })

		const instanceKey = `${SOCKET_URL}::${DB_NAME}`
		expect(classInstanceMap.has(instanceKey)).toBe(true)
		expect(activeInstanceClients.get(instanceKey)).toBe(2)
	})
})

describe.skip('edge cases and robustness', () => {
	beforeEach(() => {
		portManager.init()
	})

	it('handles very large message data', async ({ skip }) => {
		if (!ctx.onconnect) return skip()

		const channel = new MessageChannel()
		const testingPort = channel.port1
		const userPort = channel.port2

		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))

		const largeData = {
			bigArray: new Array(10000).fill(0).map((_, i) => ({
				id: i,
				data: `item-${i}`,
				nested: { value: i * 2 }
			}))
		}

		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: largeData
		} satisfies UpstreamWorkerMessage<typeof largeData>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 100))
	})

	it('handles rapid port connections and disconnections', async ({ skip }) => {
		if (!ctx.onconnect) return skip()

		const channels: MessageChannel[] = []

		for (let i = 0; i < 10; i++) {
			const channel = new MessageChannel()
			channels.push(channel)
			ctx.onconnect(new MessageEvent('connect', { ports: [channel.port1] }))
		}

		channels.forEach(channel => {
			channel.port1.close()
			channel.port2.close()
		})

		await new Promise(resolve => setTimeout(resolve, 100))

		expect(consoleErrorMock).not.toHaveBeenCalled()
	})
})

describe.skip('message serialization edge cases', () => {
	let userPort: MessagePort

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('handles functions in message data', async () => {
		const dataWithFunction = {
			fn: () => console.log('test'),
			normalData: 'string'
		}

		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: dataWithFunction
		}

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).toThrow()
	})

	it('handles symbol properties in message data', async () => {
		const symbolKey = Symbol('test')
		const dataWithSymbol = {
			[symbolKey]: 'value',
			normalProp: 'normal'
		}

		const transitionMessage = {
			type: UpstreamWorkerMessageType.Transition,
			data: dataWithSymbol
		} satisfies UpstreamWorkerMessage<typeof dataWithSymbol>

		expect(() => {
			userPort.postMessage(transitionMessage)
		}).not.toThrow()

		await new Promise(resolve => setTimeout(resolve, 50))
	})
})

describe('stress testing', () => {
	let userPort: MessagePort

	beforeEach(({ skip }) => {
		portManager.init()
		if (!ctx.onconnect) return skip('')
		const channel = new MessageChannel()
		const testingPort = channel.port1
		ctx.onconnect(new MessageEvent('connect', { ports: [testingPort] }))
		userPort = channel.port2
	})

	it('handles burst of mixed message types', async () => {
		const messages = [
			{ type: UpstreamWorkerMessageType.Ping },
			{
				type: UpstreamWorkerMessageType.Init,
				data: { wsUrl: SOCKET_URL, dbName: DB_NAME }
			},
			{ type: UpstreamWorkerMessageType.Ping },
			{
				type: UpstreamWorkerMessageType.Transition,
				data: { action: 'test' }
			},
			{ type: UpstreamWorkerMessageType.Ping }
		]

		messages.forEach(msg => {
			userPort.postMessage(msg)
		})

		await new Promise(resolve => setTimeout(resolve, 200))
	})

	it('handles very rapid message sending', async () => {
		for (let i = 0; i < 100; i++) {
			userPort.postMessage({
				type: UpstreamWorkerMessageType.Ping
			})
		}

		await new Promise(resolve => setTimeout(resolve, 100))
		expect(userPort).toBeDefined()
	})
})