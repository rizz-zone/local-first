import { expect, it } from 'vitest'
import { __testing__do_not_use_ever__resetInit } from './port_manager'

it('allows for vitest use', () => {
	expect(__testing__do_not_use_ever__resetInit).not.toThrow()
})
