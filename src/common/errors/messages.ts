const INTERNAL_PROCESS =
	'This is a process that happens internally, so this is probably a problem with ground0, not your code.'
const reportAt = (reportSnake: string) =>
	`Report at https://ground0.rizz.zone/report/${reportSnake}`

const createInitString = (item: string, reportSnake: string) =>
	`${item} was initialized twice! ${INTERNAL_PROCESS} ${reportAt(reportSnake)}`

export const TEST_ONLY = `Testing function run outside of Vitest. ${INTERNAL_PROCESS} ${reportAt('test_only_fn_used')}`
export const DOUBLE_SHAREDWORKER_PORT_INIT = createInitString(
	'SharedWorker port',
	'sw_double_init'
)
export const workerDoubleInit = (shared: boolean) =>
	`${shared ? 'Shared' : ''}Worker entrypoint called twice. To resolve this:
- Only call ${shared ? 'sharedW' : 'w'}orkerEntrypoint() once throughout the lifecycle of the worker
- Do not run any other code inside of your worker.`
