import { createActor } from 'xstate'
import { clientMachine } from './machines/client'

export class LocalFirst {
	private machine

	constructor() {
		this.machine = createActor(clientMachine)
		this.machine.start()
	}
}
