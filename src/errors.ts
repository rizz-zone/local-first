export class NoPortsError extends Error {
	constructor(message) {
		super(message)
		this.name = 'NoPortsError'
	}
}
