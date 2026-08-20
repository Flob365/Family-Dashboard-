import { createDemoRepository } from '../repositories/demoRepository'
import type { FamilyRepository } from '../repositories/contracts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

export function createTestRepository() {
  let nextId = 0
  return createDemoRepository({
    storage: new MemoryStorage(),
    now: () => new Date('2026-08-13T16:00:00.000Z'),
    createId: () => `test-${++nextId}`,
  })
}

export function withFault(
  repository: FamilyRepository,
  method: keyof FamilyRepository,
  error = new Error('Test mutation failure'),
): FamilyRepository {
  let failed = false
  return new Proxy(repository, {
    get(target, property, receiver) {
      if (property === method && !failed) {
        return async () => {
          failed = true
          throw error
        }
      }
      const value = Reflect.get(target, property, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function withFaultOnCall(
  repository: FamilyRepository,
  method: keyof FamilyRepository,
  call: number,
  error = new Error('Test mutation failure'),
): FamilyRepository {
  let calls = 0
  return new Proxy(repository, {
    get(target, property) {
      const value = Reflect.get(target, property)
      if (property === method) {
        return async (...args: unknown[]) => {
          calls += 1
          if (calls === call) throw error
          return (value as (...parameters: unknown[]) => unknown).apply(target, args)
        }
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
