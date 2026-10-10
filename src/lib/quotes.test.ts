import { describe, it, expect } from 'vitest'
import { QUOTES, randomQuote } from './quotes'

describe('QUOTES', () => {
  it('数量足够并且每条都有出处', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(20)
    for (const q of QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(0)
      expect(q.author.trim().length).toBeGreaterThan(0)
    }
  })

  it('文案与出处都不重复', () => {
    const texts = QUOTES.map(q => q.text)
    expect(new Set(texts).size).toBe(texts.length)

    const authors = QUOTES.map(q => q.author)
    expect(new Set(authors).size).toBeGreaterThan(5)
  })
})

describe('randomQuote', () => {
  it('注入随机源后取值确定', () => {
    expect(randomQuote(undefined, () => 0)).toBe(QUOTES[0])
    expect(randomQuote(undefined, () => 0.999999)).toBe(QUOTES[QUOTES.length - 1])
  })

  it('随机值取到边界 1 时不会越界', () => {
    expect(randomQuote(undefined, () => 1)).toBe(QUOTES[QUOTES.length - 1])
  })

  it('排除上一条后不会返回同一条', () => {
    const first = QUOTES[0]
    for (let i = 0; i < 60; i++) {
      expect(randomQuote(first.text).text).not.toBe(first.text)
    }
  })

  it('排除项不存在时也能正常返回', () => {
    expect(QUOTES).toContain(randomQuote('这条文案并不存在'))
  })
})
