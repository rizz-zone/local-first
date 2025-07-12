import { describe, it, expect, beforeEach } from 'vitest';
import { createDurableObject } from './durable_object';

describe('createDurableObject', () => {
  let DurableObjectClass: ReturnType<typeof createDurableObject>;
  let instance: InstanceType<ReturnType<typeof createDurableObject>>;

  beforeEach(() => {
    DurableObjectClass = createDurableObject();
    instance = new DurableObjectClass();
  });

  describe('Factory Function', () => {
    it('should return a class constructor', () => {
      const DurableObject = createDurableObject();

      expect(typeof DurableObject).toBe('function');
      expect(DurableObject.prototype).toBeDefined();
      expect(DurableObject.prototype.constructor).toBe(DurableObject);
    });

    it('should return a new class instance each time it is called', () => {
      const DurableObject1 = createDurableObject();
      const DurableObject2 = createDurableObject();

      expect(DurableObject1).not.toBe(DurableObject2);
      expect(DurableObject1.prototype).not.toBe(DurableObject2.prototype);
    });

    it('should create classes that can be instantiated independently', () => {
      const DurableObject1 = createDurableObject();
      const DurableObject2 = createDurableObject();

      const instance1 = new DurableObject1();
      const instance2 = new DurableObject2();

      expect(instance1).toBeInstanceOf(DurableObject1);
      expect(instance2).toBeInstanceOf(DurableObject2);
      expect(instance1).not.toBeInstanceOf(DurableObject2);
      expect(instance2).not.toBeInstanceOf(DurableObject1);
    });

    it('should create classes with identical behavior but separate identity', () => {
      const DurableObject1 = createDurableObject();
      const DurableObject2 = createDurableObject();

      const instance1 = new DurableObject1();
      const instance2 = new DurableObject2();

      // Both should have identical behavior
      expect(instance1.getB()).toBe(instance2.getB());
      expect(typeof instance1.getB).toBe(typeof instance2.getB);

      // But different constructors
      expect(instance1.constructor).not.toBe(instance2.constructor);
    });
  });

  describe('Class Constructor', () => {
    it('should initialize private field #b to 10', () => {
      expect(instance.getB()).toBe(10);
    });

    it('should create independent instances with separate private fields', () => {
      const instance1 = new DurableObjectClass();
      const instance2 = new DurableObjectClass();

      expect(instance1.getB()).toBe(10);
      expect(instance2.getB()).toBe(10);

      // Verify they are separate instances
      expect(instance1).not.toBe(instance2);
    });

    it('should not expose private field #b directly', () => {
      // Private fields should not be accessible from outside the class
      const record = instance as unknown as Record<string, unknown>;
      expect(record['#b']).toBeUndefined();
      expect(record.b).toBeUndefined();
      expect(Object.keys(instance)).not.toContain('#b');
      expect(Object.keys(instance)).not.toContain('b');

      // The only way to access should be through getB()
      expect(instance.getB()).toBe(10);
    });

    it('should work with multiple instantiations', () => {
      const instances = Array.from({ length: 100 }, () => new DurableObjectClass());

      instances.forEach(inst => {
        expect(inst.getB()).toBe(10);
        expect(inst).toBeInstanceOf(DurableObjectClass);
      });
    });

    it('should properly initialize without parameters', () => {
      expect(() => new DurableObjectClass()).not.toThrow();
      const newInstance = new DurableObjectClass();
      expect(newInstance.getB()).toBe(10);
    });
  });

  describe('getB Method', () => {
    it('should return the correct private field value', () => {
      expect(instance.getB()).toBe(10);
      expect(typeof instance.getB()).toBe('number');
    });

    it('should be consistent across multiple calls', () => {
      const firstCall = instance.getB();
      const secondCall = instance.getB();
      const thirdCall = instance.getB();

      expect(firstCall).toBe(10);
      expect(secondCall).toBe(10);
      expect(thirdCall).toBe(10);
      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
    });

    it('should be a method and not a property', () => {
      expect(typeof instance.getB).toBe('function');
      expect(instance.getB.length).toBe(0); // No parameters expected
    });

    it('should maintain encapsulation of private field', () => {
      const result = instance.getB();

      // Modifying the returned value should not affect the internal state
      const modifiedResult = result + 5;
      expect(modifiedResult).toBe(15);
      expect(instance.getB()).toBe(10); // Original value unchanged
    });

    it('should return primitive number value', () => {
      const result = instance.getB();
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(10);
      expect(result.constructor).toBe(Number);
    });
  });

  describe('Class Properties and Methods', () => {
    it('should have the expected method on the prototype', () => {
      expect(DurableObjectClass.prototype.getB).toBeDefined();
      expect(typeof DurableObjectClass.prototype.getB).toBe('function');
    });

    it('should not have any enumerable properties on the instance', () => {
      const enumerableKeys = Object.keys(instance);
      expect(enumerableKeys).toHaveLength(0);
    });

    it('should not have any enumerable properties on the prototype except constructor', () => {
      const enumerableKeys = Object.keys(DurableObjectClass.prototype);
      expect(enumerableKeys).toHaveLength(0);
    });

    it('should have correct property descriptors', () => {
      const descriptor = Object.getOwnPropertyDescriptor(DurableObjectClass.prototype, 'getB');

      expect(descriptor).toBeDefined();
      if (descriptor) {
        expect(descriptor.enumerable).toBe(false);
        expect(descriptor.configurable).toBe(true);
        expect(descriptor.writable).toBe(true);
        expect(typeof descriptor.value).toBe('function');
      }
    });

    it('should have proper constructor property', () => {
      expect(instance.constructor).toBe(DurableObjectClass);
      expect(DurableObjectClass.prototype.constructor).toBe(DurableObjectClass);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle prototype manipulation gracefully', () => {
      const originalGetB = DurableObjectClass.prototype.getB;

      // Temporarily modify prototype
      DurableObjectClass.prototype.getB = () => 42;

      const newInstance = new DurableObjectClass();
      expect(newInstance.getB()).toBe(42);

      // Restore original method
      DurableObjectClass.prototype.getB = originalGetB;

      const restoredInstance = new DurableObjectClass();
      expect(restoredInstance.getB()).toBe(10);
    });

    it('should work correctly with inheritance patterns', () => {
      class ExtendedDurableObject extends DurableObjectClass {
        getDouble() {
          return this.getB() * 2;
        }

        getTriple() {
          return this.getB() * 3;
        }
      }

      const extendedInstance = new ExtendedDurableObject();
      expect(extendedInstance.getB()).toBe(10);
      expect(extendedInstance.getDouble()).toBe(20);
      expect(extendedInstance.getTriple()).toBe(30);
      expect(extendedInstance).toBeInstanceOf(ExtendedDurableObject);
      expect(extendedInstance).toBeInstanceOf(DurableObjectClass);
    });

    it('should maintain correct this binding in methods', () => {
      const { getB } = instance;

      // Method should maintain correct this binding when extracted
      expect(getB.call(instance)).toBe(10);
      expect(getB.apply(instance)).toBe(10);
    });

    it('should handle method binding correctly', () => {
      const boundGetB = instance.getB.bind(instance);
      expect(boundGetB()).toBe(10);

      const anotherInstance = new DurableObjectClass();
      const crossBoundGetB = instance.getB.bind(anotherInstance);
      expect(crossBoundGetB()).toBe(10);
    });

    it('should handle Object.freeze gracefully', () => {
      const frozenInstance = Object.freeze(new DurableObjectClass());
      expect(frozenInstance.getB()).toBe(10);
      expect(() => frozenInstance.getB()).not.toThrow();
    });

    it('should handle Object.seal gracefully', () => {
      const sealedInstance = Object.seal(new DurableObjectClass());
      expect(sealedInstance.getB()).toBe(10);
      expect(() => sealedInstance.getB()).not.toThrow();
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with multiple instantiations', () => {
      const instances: InstanceType<typeof DurableObjectClass>[] = [];

      // Create many instances
      for (let i = 0; i < 1000; i++) {
        instances.push(new DurableObjectClass());
      }

      // All should work correctly
      instances.forEach(inst => {
        expect(inst.getB()).toBe(10);
      });

      // Clear references
      instances.length = 0;
    });

    it('should have minimal overhead for method calls', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        instance.getB();
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete reasonably quickly (less than 100ms for 10k calls)
      expect(duration).toBeLessThan(100);
    });

    it('should create instances efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        new DurableObjectClass();
      }

      const end = performance.now();
      const duration = end - start;

      // Should create instances quickly (less than 50ms for 1k instances)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should maintain TypeScript type safety', () => {
      // These should compile without TypeScript errors
      const result: number = instance.getB();
      expect(typeof result).toBe('number');

      const ClassType: new () => { getB(): number } = DurableObjectClass;
      const typedInstance = new ClassType();
      expect(typedInstance.getB()).toBe(10);
    });

    it('should work with generic type constraints', () => {
      function processInstance<T extends { getB(): number }>(obj: T): number {
        return obj.getB();
      }

      expect(processInstance(instance)).toBe(10);
    });

    it('should satisfy structural typing requirements', () => {
      interface DurableObjectInterface {
        getB(): number;
      }

      const interfaceInstance: DurableObjectInterface = instance;
      expect(interfaceInstance.getB()).toBe(10);
    });

    it('should work with duck typing', () => {
      function requiresGetB(obj: { getB(): number }) {
        return obj.getB() * 2;
      }

      expect(requiresGetB(instance)).toBe(20);
    });
  });

  describe('Serialization and Cloning', () => {
    it('should handle JSON serialization of public interface', () => {
      const serialized = JSON.stringify({ value: instance.getB() });
      const parsed = JSON.parse(serialized);
      expect(parsed.value).toBe(10);
    });

    it('should not serialize private fields', () => {
      const serialized = JSON.stringify(instance);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual({});
      expect(parsed['#b']).toBeUndefined();
      expect(parsed.b).toBeUndefined();
    });

    it('should handle Object.assign correctly', () => {
      const target = {};
      const result = Object.assign(target, instance);
      expect(result).toEqual({});
      expect((result as any).getB).toBeUndefined();
    });
  });
});

// Additional integration-style tests for factory pattern
describe('createDurableObject Factory Pattern Integration', () => {
  it('should support creating multiple different durable object types', () => {
    const DurableObjectA = createDurableObject();
    const DurableObjectB = createDurableObject();

    const instanceA = new DurableObjectA();
    const instanceB = new DurableObjectB();

    expect(instanceA.getB()).toBe(10);
    expect(instanceB.getB()).toBe(10);
    expect(instanceA.constructor).not.toBe(instanceB.constructor);
  });

  it('should work in functional programming patterns', () => {
    const factories = [createDurableObject, createDurableObject, createDurableObject];
    const classes = factories.map(factory => factory());
    const instances = classes.map(Class => new Class());

    instances.forEach(instance => {
      expect(instance.getB()).toBe(10);
    });

    // Verify all instances have different constructors
    const constructors = instances.map(inst => inst.constructor);
    const uniqueConstructors = new Set(constructors);
    expect(uniqueConstructors.size).toBe(3);
  });

  it('should support composition patterns', () => {
    function createDurableObjectWithId(id: string) {
      const BaseClass = createDurableObject();

      return class extends BaseClass {
        id = id;

        getId() {
          return this.id;
        }

        getState() {
          return {
            id: this.id,
            b: this.getB()
          };
        }
      };
    }

    const DurableObjectWithId = createDurableObjectWithId('test-123');
    const instance = new DurableObjectWithId();

    expect(instance.getId()).toBe('test-123');
    expect(instance.getB()).toBe(10);
    expect(instance.getState()).toEqual({ id: 'test-123', b: 10 });
  });

  it('should work with mixin patterns', () => {
    function addLogging<T extends new (...args: any[]) => any>(Base: T) {
      return class extends Base {
        private logs: string[] = [];

        log(message: string) {
          this.logs.push(message);
        }

        getLogs() {
          return [...this.logs];
        }
      };
    }

    const DurableObject = createDurableObject();
    const LoggingDurableObject = addLogging(DurableObject);
    const instance = new LoggingDurableObject();

    expect(instance.getB()).toBe(10);
    instance.log('test message');
    expect(instance.getLogs()).toEqual(['test message']);
  });

  it('should support dependency injection patterns', () => {
    function createConfiguredDurableObject(config: { multiplier: number }) {
      const BaseClass = createDurableObject();

      return class extends BaseClass {
        getB() {
          return super.getB() * config.multiplier;
        }
      };
    }

    const ConfiguredDurableObject = createConfiguredDurableObject({ multiplier: 2 });
    const instance = new ConfiguredDurableObject();

    expect(instance.getB()).toBe(20);
  });

  it('should work with factory registry patterns', () => {
    const registry = new Map<string, ReturnType<typeof createDurableObject>>();

    function registerDurableObject(name: string) {
      registry.set(name, createDurableObject());
    }

    function createFromRegistry(name: string) {
      const Constructor = registry.get(name);
      if (!Constructor) throw new Error(`Unknown type: ${name}`);
      return new Constructor();
    }

    registerDurableObject('default');
    registerDurableObject('backup');

    const instance1 = createFromRegistry('default');
    const instance2 = createFromRegistry('backup');

    expect(instance1.getB()).toBe(10);
    expect(instance2.getB()).toBe(10);
    expect(instance1.constructor).not.toBe(instance2.constructor);
  });
});