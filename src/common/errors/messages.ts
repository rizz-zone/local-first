const INTERNAL_PROCESS =
	'This is a process that happens internally, so this is probably a problem with ground0, not your code.'
const reportAt = (reportSnake: string) =>
	`Report at https://ground0.rizz.zone/report/${reportSnake}`

const createInitString = (item: string, reportSnake: string) =>
	`${item} was initialized twice! ${INTERNAL_PROCESS} ${reportAt(reportSnake)}`

export const TEST_ONLY = `Testing function run outside of Vitest. ${INTERNAL_PROCESS} ${reportAt('test_only_fn_used')}`
export const DOUBLE_PORT_MANAGER_INIT = createInitString(
	'Port manager',
	'pm_double_init'
)
export const DOUBLE_SHAREDWORKER_PORT_INIT = createInitString(
	'SharedWorker port',
	'sw_double_init'
)
