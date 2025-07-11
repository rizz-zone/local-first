export class NoPortsError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'NoPortsError'

		Object.setPrototypeOf(this, NoPortsError.prototype)
	}
}
export class PortDoubleInitError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DoublePortInitError'

		Object.setPrototypeOf(this, AbsentPortDisconnectionError.prototype)
	}
}
export class AbsentPortDisconnectionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AbsentPortDisconnectionError'

		Object.setPrototypeOf(this, AbsentPortDisconnectionError.prototype)
	}
}
