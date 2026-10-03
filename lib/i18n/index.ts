import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enOnboarding from './locales/en/onboarding.json'
import enLmp from './locales/en/lmp.json'
import enCarePlan from './locales/en/carePlan.json'
import enCatchUp from './locales/en/catchUp.json'
import enBooked from './locales/en/booked.json'
import enHome from './locales/en/home.json'
import enPlan from './locales/en/plan.json'
import enHealth from './locales/en/health.json'
import enBrainDump from './locales/en/brainDump.json'
import enBusiness from './locales/en/business.json'
import enAppointmentDetail from './locales/en/appointmentDetail.json'
import enAddItem from './locales/en/addItem.json'
import enAppointments from './locales/en/appointments.json'
import enEditBrainDump from './locales/en/editBrainDump.json'
import enProfile from './locales/en/profile.json'
import enTabs from './locales/en/tabs.json'
import heCommon from './locales/he/common.json'
import heAuth from './locales/he/auth.json'
import heOnboarding from './locales/he/onboarding.json'
import heLmp from './locales/he/lmp.json'
import heCarePlan from './locales/he/carePlan.json'
import heCatchUp from './locales/he/catchUp.json'
import heBooked from './locales/he/booked.json'
import heHome from './locales/he/home.json'
import hePlan from './locales/he/plan.json'
import heHealth from './locales/he/health.json'
import heBrainDump from './locales/he/brainDump.json'
import heBusiness from './locales/he/business.json'
import heAppointmentDetail from './locales/he/appointmentDetail.json'
import heAddItem from './locales/he/addItem.json'
import heAppointments from './locales/he/appointments.json'
import heEditBrainDump from './locales/he/editBrainDump.json'
import heProfile from './locales/he/profile.json'
import heTabs from './locales/he/tabs.json'

export const defaultNS = 'common'

export const resources = {
  en: { common: enCommon, auth: enAuth, onboarding: enOnboarding, lmp: enLmp, carePlan: enCarePlan, catchUp: enCatchUp, booked: enBooked, home: enHome, plan: enPlan, health: enHealth, brainDump: enBrainDump, business: enBusiness, appointmentDetail: enAppointmentDetail, addItem: enAddItem, appointments: enAppointments, editBrainDump: enEditBrainDump, profile: enProfile, tabs: enTabs },
  he: { common: heCommon, auth: heAuth, onboarding: heOnboarding, lmp: heLmp, carePlan: heCarePlan, catchUp: heCatchUp, booked: heBooked, home: heHome, plan: hePlan, health: heHealth, brainDump: heBrainDump, business: heBusiness, appointmentDetail: heAppointmentDetail, addItem: heAddItem, appointments: heAppointments, editBrainDump: heEditBrainDump, profile: heProfile, tabs: heTabs },
} as const

i18next.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
})

export default i18next
