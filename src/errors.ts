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

		Object.setPrototypeOf(this, NoPortsError.prototype)
	}
}
