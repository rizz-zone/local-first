export class BrowserLocalFirst {
	private worker

	constructor({
		dbName,
		wsUrl,
		worker
	}: {
		dbName: string
		wsUrl: string
		worker?: Worker | SharedWorker
	}) {
		this.worker =
			(worker ?? 'SharedWorker' in window)
				? new SharedWorker(
						new URL('../entrypoints/shared_worker.ts', import.meta.url),
						{
							type: 'module'
						}
					)
				: new Worker(new URL('../entrypoints/worker.ts', import.meta.url), {
						type: 'module'
					})

		console.log(dbName, wsUrl)
	}
}
