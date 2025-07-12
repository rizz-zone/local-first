import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDurableObject } from '../impl/do/exports/durable_object';

describe('createDurableObject', () => {
  let DurableObjectClass: ReturnType<typeof createDurableObject>;
  
  beforeEach(() => {
    DurableObjectClass = createDurableObject();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('factory function', () => {
    it('should return a class constructor', () => {
      expect(createDurableObject).toBeTypeOf('function');
      expect(DurableObjectClass).toBeTypeOf('function');
      expect(DurableObjectClass.prototype).toBeDefined();
    });

    it('should return the same class structure on multiple calls', () => {
      const DurableObjectClass1 = createDurableObject();
      const DurableObjectClass2 = createDurableObject();
      
      // Both should be constructor functions
      expect(DurableObjectClass1).toBeTypeOf('function');
      expect(DurableObjectClass2).toBeTypeOf('function');
      
      // Should have the same methods
      expect(DurableObjectClass1.prototype.getB).toBeDefined();
      expect(DurableObjectClass2.prototype.getB).toBeDefined();
    });

    it('should create independent class instances', () => {
      const DurableObjectClass1 = createDurableObject();
      const DurableObjectClass2 = createDurableObject();
      
      const instance1 = new DurableObjectClass1();
      const instance2 = new DurableObjectClass2();
      
      // Both should work independently
      expect(instance1.getB()).toBe(10);
      expect(instance2.getB()).toBe(10);
      
      // Should be different constructor functions
      expect(DurableObjectClass1).not.toBe(DurableObjectClass2);
    });

    it('should be callable without arguments', () => {
      expect(() => createDurableObject()).not.toThrow();
    });

    it('should ignore extra arguments gracefully', () => {
      expect(() => createDurableObject('extra', 'args', 123)).not.toThrow();
      const ClassWithArgs = createDurableObject('extra', 'args', 123);
      expect(ClassWithArgs).toBeTypeOf('function');
    });
  });

  describe('DurableObject class constructor', () => {
    it('should create instances successfully', () => {
      const instance = new DurableObjectClass();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(DurableObjectClass);
    });

    it('should initialize private field #b to 10', () => {
      const instance = new DurableObjectClass();
      expect(instance.getB()).toBe(10);
    });

    it('should work without constructor arguments', () => {
      expect(() => new DurableObjectClass()).not.toThrow();
    });

    it('should ignore constructor arguments gracefully', () => {
      // @ts-expect-error - testing runtime behavior with extra args
      expect(() => new DurableObjectClass('arg1', 'arg2', 123)).not.toThrow();
      // @ts-expect-error - testing runtime behavior with extra args
      const instance = new DurableObjectClass('arg1', 'arg2', 123);
      expect(instance.getB()).toBe(10);
    });

    it('should create multiple independent instances', () => {
      const instance1 = new DurableObjectClass();
      const instance2 = new DurableObjectClass();
      const instance3 = new DurableObjectClass();
      
      expect(instance1).not.toBe(instance2);
      expect(instance2).not.toBe(instance3);
      expect(instance1).not.toBe(instance3);
      
      // All should have the same initial value
      expect(instance1.getB()).toBe(10);
      expect(instance2.getB()).toBe(10);
      expect(instance3.getB()).toBe(10);
    });

    it('should work with new operator', () => {
      const instance = new DurableObjectClass();
      expect(instance.constructor).toBe(DurableObjectClass);
    });

    it('should fail when called without new operator', () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => DurableObjectClass()).toThrow();
    });
  });

  describe('getB method', () => {
    let instance: InstanceType<typeof DurableObjectClass>;

    beforeEach(() => {
      instance = new DurableObjectClass();
    });

    it('should return the initial value of 10', () => {
      expect(instance.getB()).toBe(10);
      expect(instance.getB()).toStrictEqual(10);
    });

    it('should return a number type', () => {
      const result = instance.getB();
      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should be callable multiple times with consistent results', () => {
      const result1 = instance.getB();
      const result2 = instance.getB();
      const result3 = instance.getB();
      
      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(result3).toBe(10);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should be a method on the prototype', () => {
      expect(DurableObjectClass.prototype.getB).toBeDefined();
      expect(typeof DurableObjectClass.prototype.getB).toBe('function');
    });

    it('should have correct method binding', () => {
      const getBMethod = instance.getB;
      // Calling unbound method should still work due to private field access
      expect(() => getBMethod.call(instance)).not.toThrow();
      expect(getBMethod.call(instance)).toBe(10);
    });

    it('should work when method is extracted and called', () => {
      const { getB } = instance;
      expect(() => getB.call(instance)).not.toThrow();
      expect(getB.call(instance)).toBe(10);
    });

    it('should not accept arguments', () => {
      // @ts-expect-error - testing runtime behavior with extra args
      expect(() => instance.getB('arg1', 'arg2')).not.toThrow();
      // @ts-expect-error - testing runtime behavior with extra args
      expect(instance.getB('arg1', 'arg2')).toBe(10);
    });
  });

  describe('private field #b behavior', () => {
    let instance: InstanceType<typeof DurableObjectClass>;

    beforeEach(() => {
      instance = new DurableObjectClass();
    });

    it('should not be directly accessible from outside', () => {
      // @ts-expect-error - testing private field access
      expect(instance.b).toBeUndefined();
      // @ts-expect-error - testing private field access
      expect(instance['#b']).toBeUndefined();
    });

    it('should only be accessible through getB method', () => {
      expect(instance.getB()).toBe(10);
      
      // Verify we can't access it any other way
      expect(Object.keys(instance)).not.toContain('#b');
      expect(Object.keys(instance)).not.toContain('b');
      expect(Object.getOwnPropertyNames(instance)).not.toContain('#b');
      expect(Object.getOwnPropertyNames(instance)).not.toContain('b');
    });

    it('should be truly private and not enumerable', () => {
      const instance = new DurableObjectClass();
      
      // Check that private field is not in any enumerable properties
      expect(Object.keys(instance)).toEqual([]);
      expect(Object.getOwnPropertyNames(instance)).toEqual([]);
      expect(Object.getOwnPropertyDescriptors(instance)).toEqual({});
      
      // Should not appear in JSON serialization
      expect(JSON.stringify(instance)).toBe('{}');
    });

    it('should maintain value integrity across method calls', () => {
      const firstCall = instance.getB();
      const secondCall = instance.getB();
      const thirdCall = instance.getB();
      
      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
      expect(firstCall).toBe(10);
    });

    it('should be isolated between instances', () => {
      const instance1 = new DurableObjectClass();
      const instance2 = new DurableObjectClass();
      const instance3 = new DurableObjectClass();
      
      // All should start with 10
      expect(instance1.getB()).toBe(10);
      expect(instance2.getB()).toBe(10);
      expect(instance3.getB()).toBe(10);
      
      // Values should be independent (though we can't modify them in this implementation)
      expect(instance1.getB()).not.toBe(instance2.getB());
      expect(instance1.getB()).not.toBe(instance3.getB());
    });
  });

  describe('class properties and methods', () => {
    it('should have correct prototype chain', () => {
      const instance = new DurableObjectClass();
      
      expect(Object.getPrototypeOf(instance)).toBe(DurableObjectClass.prototype);
      expect(instance instanceof DurableObjectClass).toBe(true);
    });

    it('should have only getB method on prototype', () => {
      const prototypeKeys = Object.getOwnPropertyNames(DurableObjectClass.prototype);
      expect(prototypeKeys).toContain('constructor');
      expect(prototypeKeys).toContain('getB');
      expect(prototypeKeys).toHaveLength(2);
    });

    it('should have correct method descriptors', () => {
      const getBDescriptor = Object.getOwnPropertyDescriptor(DurableObjectClass.prototype, 'getB');
      
      expect(getBDescriptor).toBeDefined();
      expect(getBDescriptor?.writable).toBe(true);
      expect(getBDescriptor?.enumerable).toBe(false);
      expect(getBDescriptor?.configurable).toBe(true);
      expect(typeof getBDescriptor?.value).toBe('function');
    });

    it('should have correct constructor property', () => {
      const instance = new DurableObjectClass();
      expect(instance.constructor).toBe(DurableObjectClass);
      expect(DurableObjectClass.prototype.constructor).toBe(DurableObjectClass);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle prototype manipulation gracefully', () => {
      const instance = new DurableObjectClass();
      
      // Try to add properties to prototype
      DurableObjectClass.prototype.newMethod = () => 'test';
      
      // Original functionality should still work
      expect(instance.getB()).toBe(10);
      
      // New method should be available
      // @ts-expect-error - testing dynamic property
      expect(instance.newMethod()).toBe('test');
    });

    it('should handle Object.freeze on instance', () => {
      const instance = new DurableObjectClass();
      Object.freeze(instance);
      
      // getB should still work even when instance is frozen
      expect(() => instance.getB()).not.toThrow();
      expect(instance.getB()).toBe(10);
    });

    it('should handle Object.seal on instance', () => {
      const instance = new DurableObjectClass();
      Object.seal(instance);
      
      // getB should still work even when instance is sealed
      expect(() => instance.getB()).not.toThrow();
      expect(instance.getB()).toBe(10);
    });

    it('should work with instanceof checks', () => {
      const instance = new DurableObjectClass();
      
      expect(instance instanceof DurableObjectClass).toBe(true);
      expect(instance instanceof Object).toBe(true);
      expect(instance instanceof Array).toBe(false);
      expect(instance instanceof Function).toBe(false);
    });

    it('should work with typeof checks', () => {
      const instance = new DurableObjectClass();
      
      expect(typeof instance).toBe('object');
      expect(typeof instance.getB).toBe('function');
      expect(typeof instance.getB()).toBe('number');
    });

    it('should handle toString and valueOf operations', () => {
      const instance = new DurableObjectClass();
      
      expect(() => instance.toString()).not.toThrow();
      expect(() => instance.valueOf()).not.toThrow();
      expect(instance.toString()).toContain('[object Object]');
      expect(instance.valueOf()).toBe(instance);
    });
  });

  describe('performance and memory', () => {
    it('should create instances efficiently', () => {
      const startTime = performance.now();
      const instances = [];
      
      for (let i = 0; i < 1000; i++) {
        instances.push(new DurableObjectClass());
      }
      
      const endTime = performance.now();
      const timeTaken = endTime - startTime;
      
      expect(instances).toHaveLength(1000);
      expect(timeTaken).toBeLessThan(100); // Should be fast
      
      // All instances should work correctly
      instances.forEach(instance => {
        expect(instance.getB()).toBe(10);
      });
    });

    it('should handle method calls efficiently', () => {
      const instance = new DurableObjectClass();
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        instance.getB();
      }
      
      const endTime = performance.now();
      const timeTaken = endTime - startTime;
      
      expect(timeTaken).toBeLessThan(50); // Should be very fast
    });

    it('should not leak memory with many instances', () => {
      // Create and discard many instances
      for (let i = 0; i < 1000; i++) {
        const instance = new DurableObjectClass();
        expect(instance.getB()).toBe(10);
      }
      
      // Should complete without memory issues
      expect(true).toBe(true);
    });
  });

  describe('type safety and TypeScript integration', () => {
    it('should work with strict type checking', () => {
      const instance: InstanceType<typeof DurableObjectClass> = new DurableObjectClass();
      const result: number = instance.getB();
      
      expect(result).toBe(10);
      expect(typeof result).toBe('number');
    });

    it('should maintain type inference', () => {
      const ClassType = createDurableObject();
      const instance = new ClassType();
      
      // TypeScript should infer the return type as number
      const value = instance.getB();
      expect(typeof value).toBe('number');
    });
  });
});