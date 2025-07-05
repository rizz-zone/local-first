export class NoPortsError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'NoPortsError'
	}
}
