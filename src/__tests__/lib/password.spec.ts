import { describe, it, expect } from 'vitest'
import { isStrongPassword } from '@/lib/password'

describe('isStrongPassword', () => {
  it.each([
    ['Tajna12345', true],
    ['Šifra12345', true],
    ['Tajna1234', false],
    ['tajna12345', false],
    ['TAJNA12345', false],
    ['TajnaTajna', false],
  ])('%s → %s', (password, strong) => {
    expect(isStrongPassword(password)).toBe(strong)
  })
})
