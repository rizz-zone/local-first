import { createActor } from 'xstate'
import { clientMachine } from '../machines/worker'

export class WorkerLocalFirst {
	private machine

	constructor() {
		this.machine = createActor(clientMachine)
		this.machine.start()
	}
	init() {}

	public [Symbol.dispose] = () => {
		this.machine.stop()
	}
}
