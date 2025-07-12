export function createDurableObject() {
	return class {
		#b
		constructor() {
			this.#b = 10
		}
		getB() {
			return this.#b
		}
	}
}
