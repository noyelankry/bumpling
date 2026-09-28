import { Tabs } from 'expo-router'
import RadialTabBar from '../../components/RadialTabBar'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <RadialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="health" options={{ title: 'Health' }} />
      <Tabs.Screen name="more" options={{ title: 'You' }} />
    </Tabs>
  )
}
