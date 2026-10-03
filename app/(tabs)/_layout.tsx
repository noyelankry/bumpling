import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import RadialTabBar from '../../components/RadialTabBar'

export default function TabLayout() {
  const { t } = useTranslation('tabs')
  return (
    <Tabs
      tabBar={props => <RadialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('today') }} />
      <Tabs.Screen name="plan" options={{ title: t('plan') }} />
      <Tabs.Screen name="brain-dump" options={{ title: t('brainDump') }} />
      <Tabs.Screen name="health" options={{ title: t('health') }} />
    </Tabs>
  )
}
