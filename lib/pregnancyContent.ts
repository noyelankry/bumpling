// Weekly fetal-development facts and test/scan explainers, sourced from
// lib/content/pregnancyContent.json (bilingual en/he, outside the i18next
// key system since it's indexed by week/test id, not a translation key).
import content from './content/pregnancyContent.json'
import type { Language } from './i18n/languageStorage'

type LocalizedText = { en: string; he: string }

type WeeklyFact = {
  week: number
  tag: string
  text: LocalizedText
}

type TestEntry = {
  id: string
  name: LocalizedText
  purpose: LocalizedText
}

const weeklyFacts = content.weeklyFacts as WeeklyFact[]
const testsById = new Map((content.tests as TestEntry[]).map(test => [test.id, test]))

const weekNumbers = weeklyFacts.map(f => f.week)
const MIN_WEEK = Math.min(...weekNumbers)
const MAX_WEEK = Math.max(...weekNumbers)
const factsByWeek = new Map(weeklyFacts.map(f => [f.week, f]))

export function getWeeklyFact(week: number, lang: Language): { tag: string; text: string } {
  const clamped = Math.min(Math.max(week, MIN_WEEK), MAX_WEEK)
  const fact = factsByWeek.get(clamped) ?? factsByWeek.get(MAX_WEEK)!
  return { tag: fact.tag, text: fact.text[lang] }
}

export function getTestPurpose(id: string, lang: Language): string | undefined {
  return testsById.get(id)?.purpose[lang]
}
