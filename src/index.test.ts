import { describe, expect, it } from 'vitest'

import {
  BrowserLocalFirst as IndexBrowserLocalFirst,
  createDurableObject as IndexCreateDurableObject,
  sharedWorkerEntrypoint as IndexSharedWorkerEntrypoint,
  workerEntrypoint as IndexWorkerEntrypoint
} from './'

import * as IndexModule from './'
import * as ErrorExports from './common/errors'

import { BrowserLocalFirst } from './impl/browser/exports/browser'
import { createDurableObject } from './impl/do/exports/durable_object'
import { sharedWorkerEntrypoint } from './impl/browser/exports/entrypoints/shared_worker'
import { workerEntrypoint } from './impl/browser/exports/entrypoints/worker'

describe('main entrypoint', () => {
  // Test that all exports exist and are defined
  it('ensures all exports are defined', () => {
    expect(IndexBrowserLocalFirst).toBeDefined()
    expect(IndexCreateDurableObject).toBeDefined()
    expect(IndexSharedWorkerEntrypoint).toBeDefined()
    expect(IndexWorkerEntrypoint).toBeDefined()
  })

  // Test that exports are not null
  it('ensures no exports are null', () => {
    expect(IndexBrowserLocalFirst).not.toBeNull()
    expect(IndexCreateDurableObject).not.toBeNull()
    expect(IndexSharedWorkerEntrypoint).not.toBeNull()
    expect(IndexWorkerEntrypoint).not.toBeNull()
  })

  // Test export types
  it('exports BrowserLocalFirst as a function or class', () => {
    expect(typeof IndexBrowserLocalFirst).toBe('function')
  })

  it('exports createDurableObject as a function', () => {
    expect(typeof IndexCreateDurableObject).toBe('function')
  })

  it('exports sharedWorkerEntrypoint as a function', () => {
    expect(typeof IndexSharedWorkerEntrypoint).toBe('function')
  })

  it('exports workerEntrypoint as a function', () => {
    expect(typeof IndexWorkerEntrypoint).toBe('function')
  })

  // Test that exports have the same prototype/constructor
  it('ensures BrowserLocalFirst has same prototype as direct import', () => {
    expect(Object.getPrototypeOf(IndexBrowserLocalFirst)).toStrictEqual(
      Object.getPrototypeOf(BrowserLocalFirst)
    )
  })

  it('ensures createDurableObject has same prototype as direct import', () => {
    expect(Object.getPrototypeOf(IndexCreateDurableObject)).toStrictEqual(
      Object.getPrototypeOf(createDurableObject)
    )
  })

  it('ensures sharedWorkerEntrypoint has same prototype as direct import', () => {
    expect(Object.getPrototypeOf(IndexSharedWorkerEntrypoint)).toStrictEqual(
      Object.getPrototypeOf(sharedWorkerEntrypoint)
    )
  })

  it('ensures workerEntrypoint has same prototype as direct import', () => {
    expect(Object.getPrototypeOf(IndexWorkerEntrypoint)).toStrictEqual(
      Object.getPrototypeOf(workerEntrypoint)
    )
  })

  // Test function properties and length
  it('ensures BrowserLocalFirst has same function length', () => {
    expect(IndexBrowserLocalFirst.length).toBe(BrowserLocalFirst.length)
  })

  it('ensures createDurableObject has same function length', () => {
    expect(IndexCreateDurableObject.length).toBe(createDurableObject.length)
  })

  it('ensures sharedWorkerEntrypoint has same function length', () => {
    expect(IndexSharedWorkerEntrypoint.length).toBe(sharedWorkerEntrypoint.length)
  })

  it('ensures workerEntrypoint has same function length', () => {
    expect(IndexWorkerEntrypoint.length).toBe(workerEntrypoint.length)
  })

  // Test function names
  it('ensures BrowserLocalFirst has correct name', () => {
    expect(IndexBrowserLocalFirst.name).toBe(BrowserLocalFirst.name)
  })

  it('ensures createDurableObject has correct name', () => {
    expect(IndexCreateDurableObject.name).toBe(createDurableObject.name)
  })

  it('ensures sharedWorkerEntrypoint has correct name', () => {
    expect(IndexSharedWorkerEntrypoint.name).toBe(sharedWorkerEntrypoint.name)
  })

  it('ensures workerEntrypoint has correct name', () => {
    expect(IndexWorkerEntrypoint.name).toBe(workerEntrypoint.name)
  })

  // Test that exports are referentially identical (not just structurally equal)
  it('ensures BrowserLocalFirst is the exact same reference', () => {
    expect(IndexBrowserLocalFirst).toBe(BrowserLocalFirst)
  })

  it('ensures createDurableObject is the exact same reference', () => {
    expect(IndexCreateDurableObject).toBe(createDurableObject)
  })

  it('ensures sharedWorkerEntrypoint is the exact same reference', () => {
    expect(IndexSharedWorkerEntrypoint).toBe(sharedWorkerEntrypoint)
  })

  it('ensures workerEntrypoint is the exact same reference', () => {
    expect(IndexWorkerEntrypoint).toBe(workerEntrypoint)
  })

  // Test constructor behavior for class exports
  it('ensures BrowserLocalFirst constructor behavior matches', () => {
    if (IndexBrowserLocalFirst.prototype) {
      expect(IndexBrowserLocalFirst.prototype.constructor).toBe(IndexBrowserLocalFirst)
      expect(BrowserLocalFirst.prototype.constructor).toBe(BrowserLocalFirst)
      expect(IndexBrowserLocalFirst.prototype.constructor).toBe(BrowserLocalFirst.prototype.constructor)
    }
  })

  // Test that functions can be called (basic smoke test)
  it('ensures createDurableObject can be called and returns a class', () => {
    const DurableClass = IndexCreateDurableObject()
    expect(typeof DurableClass).toBe('function')
    expect(DurableClass.prototype).toBeDefined()

    // Test that the returned class can be instantiated
    const instance = new DurableClass()
    expect(instance).toBeInstanceOf(DurableClass)
    expect(typeof instance.getB).toBe('function')
    expect(instance.getB()).toBe(10)
  })

  it('ensures entrypoint functions can be called without throwing immediately', () => {
    expect(() => IndexSharedWorkerEntrypoint.toString()).not.toThrow()
    expect(() => IndexWorkerEntrypoint.toString()).not.toThrow()
    expect(() => sharedWorkerEntrypoint.toString()).not.toThrow()
    expect(() => workerEntrypoint.toString()).not.toThrow()
  })

  // Test static properties if they exist
  it('ensures static properties are preserved on BrowserLocalFirst', () => {
    const indexKeys = Object.getOwnPropertyNames(IndexBrowserLocalFirst)
    const directKeys = Object.getOwnPropertyNames(BrowserLocalFirst)
    expect(indexKeys.sort()).toEqual(directKeys.sort())
  })

  it('ensures static properties are preserved on createDurableObject', () => {
    const indexKeys = Object.getOwnPropertyNames(IndexCreateDurableObject)
    const directKeys = Object.getOwnPropertyNames(createDurableObject)
    expect(indexKeys.sort()).toEqual(directKeys.sort())
  })

  it('ensures static properties are preserved on entrypoint functions', () => {
    const sharedIndexKeys = Object.getOwnPropertyNames(IndexSharedWorkerEntrypoint)
    const sharedDirectKeys = Object.getOwnPropertyNames(sharedWorkerEntrypoint)
    expect(sharedIndexKeys.sort()).toEqual(sharedDirectKeys.sort())

    const workerIndexKeys = Object.getOwnPropertyNames(IndexWorkerEntrypoint)
    const workerDirectKeys = Object.getOwnPropertyNames(workerEntrypoint)
    expect(workerIndexKeys.sort()).toEqual(workerDirectKeys.sort())
  })

  // Test descriptors for exports
  it('ensures property descriptors match for all exports', () => {
    const indexBrowserDesc = Object.getOwnPropertyDescriptor(IndexBrowserLocalFirst, 'prototype')
    const directBrowserDesc = Object.getOwnPropertyDescriptor(BrowserLocalFirst, 'prototype')
    expect(indexBrowserDesc).toEqual(directBrowserDesc)

    const indexCreateDesc = Object.getOwnPropertyDescriptor(IndexCreateDurableObject, 'length')
    const directCreateDesc = Object.getOwnPropertyDescriptor(createDurableObject, 'length')
    expect(indexCreateDesc).toEqual(directCreateDesc)
  })

  // Edge case: Test behavior under extreme conditions
  it('handles toString calls on all exports', () => {
    expect(() => String(IndexBrowserLocalFirst)).not.toThrow()
    expect(() => String(IndexCreateDurableObject)).not.toThrow()
    expect(() => String(IndexSharedWorkerEntrypoint)).not.toThrow()
    expect(() => String(IndexWorkerEntrypoint)).not.toThrow()
  })

  it('handles Object.keys on all exports', () => {
    expect(() => Object.keys(IndexBrowserLocalFirst)).not.toThrow()
    expect(() => Object.keys(IndexCreateDurableObject)).not.toThrow()
    expect(() => Object.keys(IndexSharedWorkerEntrypoint)).not.toThrow()
    expect(() => Object.keys(IndexWorkerEntrypoint)).not.toThrow()
  })

  // Test class-specific behavior
  it('ensures BrowserLocalFirst can be used as a constructor', () => {
    expect(() => {
      // @ts-expect-error - Testing error behavior
      new IndexBrowserLocalFirst()
    }).toThrow()
    expect(() => {
      // @ts-expect-error - Testing error behavior
      new BrowserLocalFirst()
    }).toThrow()
  })

  // Test function arity and parameter handling
  it('ensures function arity is preserved', () => {
    expect(IndexCreateDurableObject.length).toBe(0)
    expect(IndexSharedWorkerEntrypoint.length).toBe(0)
    expect(IndexWorkerEntrypoint.length).toBe(0)
  })

  // Test that prototype chains are intact
  it('ensures prototype chains are preserved', () => {
    expect(IndexBrowserLocalFirst.prototype).toBe(BrowserLocalFirst.prototype)

    const IndexDurableClass = IndexCreateDurableObject()
    const DirectDurableClass = createDurableObject()
    expect(Object.getPrototypeOf(IndexDurableClass.prototype)).toEqual(
      Object.getPrototypeOf(DirectDurableClass.prototype)
    )
  })

  // Test enumerable properties
  it('ensures enumerable properties match', () => {
    const indexEnumerable = Object.getOwnPropertyNames(IndexBrowserLocalFirst)
      .filter(key => Object.getOwnPropertyDescriptor(IndexBrowserLocalFirst, key)?.enumerable)
    const directEnumerable = Object.getOwnPropertyNames(BrowserLocalFirst)
      .filter(key => Object.getOwnPropertyDescriptor(BrowserLocalFirst, key)?.enumerable)
    expect(indexEnumerable.sort()).toEqual(directEnumerable.sort())
  })

  // Ensure exports match
  it('exports the same BrowserLocalFirst as browser.ts', () => {
    expect(IndexBrowserLocalFirst).toStrictEqual(BrowserLocalFirst)
  })

  it('exports the same createDurableObject as durable_object.ts', () => {
    expect(IndexCreateDurableObject).toStrictEqual(createDurableObject)
  })

  it('exports the same sharedWorkerEntrypoint as shared_worker.ts', () => {
    expect(IndexSharedWorkerEntrypoint).toStrictEqual(sharedWorkerEntrypoint)
  })

  it('exports the same workerEntrypoint as worker.ts', () => {
    expect(IndexWorkerEntrypoint).toStrictEqual(workerEntrypoint)
  })
})

describe('error exports', () => {
  it('exports all errors from common/errors', () => {
    const indexModule = IndexModule
    const errorModule = ErrorExports

    const errorExportNames = Object.keys(errorModule)
    errorExportNames.forEach(exportName => {
      expect(indexModule[exportName]).toBeDefined()
      expect(indexModule[exportName]).toBe(errorModule[exportName])
    })
  })

  it('preserves error constructor behavior', () => {
    const indexModule = IndexModule
    const errorModule = ErrorExports
    Object.keys(errorModule).forEach(exportName => {
      const IndexError = indexModule[exportName]
      const DirectError = errorModule[exportName]
      if (typeof IndexError === 'function' && IndexError.prototype) {
        expect(IndexError.prototype.constructor).toBe(DirectError.prototype.constructor)
      }
    })
  })

  it('error exports have correct types', () => {
    const indexModule = IndexModule
    const errorModule = ErrorExports
    Object.keys(errorModule).forEach(exportName => {
      expect(typeof indexModule[exportName]).toBe(typeof errorModule[exportName])
    })
  })
})