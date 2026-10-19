import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import RadialTabBar from '../../components/RadialTabBar'
import { currentRole } from '../../lib/carePlan'

export default function TabLayout() {
  const { t } = useTranslation('tabs')
  const [isPartner, setIsPartner] = useState(false)

  useEffect(() => {
    currentRole().then(role => setIsPartner(role === 'partner'))
  }, [])

  return (
    <Tabs
      tabBar={props => <RadialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('today') }} />
      <Tabs.Screen name="plan" options={{ title: t('plan') }} />
      <Tabs.Screen name="brain-dump" options={{ title: t('brainDump') }} />
      {/* Health is mom's own log (mood/symptoms/vitals) — not part of the
          read-only scope a partner gets (see BACKEND.md Section 14). */}
      <Tabs.Screen name="health" options={{ title: t('health'), href: isPartner ? null : undefined }} />
    </Tabs>
  )
}
