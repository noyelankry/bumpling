import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, TextInput, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { COFFEE_KEY, DEFAULT_COFFEE, type CoffeeConfig } from './diary'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type NavItem = { label: string; icon: IoniconsName; route: string; description?: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Feed',          icon: 'newspaper-outline', route: '/(tabs)/feed',     description: 'Community updates & tips' },
  { label: 'Shopping List', icon: 'cart-outline',      route: '/(tabs)/shopping', description: 'Ingredients from your meal plan' },
]

function NavRow({ item, onPress }: { item: NavItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={item.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        {item.description && <Text style={styles.rowDesc}>{item.description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )
}

export default function MoreScreen() {
  const router = useRouter()
  const [coffee, setCoffee] = useState<CoffeeConfig>(DEFAULT_COFFEE)
  const [coffeeNameDraft, setCoffeeNameDraft] = useState(DEFAULT_COFFEE.name)
  const [coffeeCalDraft,  setCoffeeCalDraft]  = useState(String(DEFAULT_COFFEE.calories))

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(COFFEE_KEY).then(raw => {
      if (raw) {
        const cfg: CoffeeConfig = JSON.parse(raw)
        setCoffee(cfg)
        setCoffeeNameDraft(cfg.name)
        setCoffeeCalDraft(String(cfg.calories))
      }
    })
  }, []))

  async function toggleCoffee(enabled: boolean) {
    const next = { ...coffee, enabled }
    setCoffee(next)
    await AsyncStorage.setItem(COFFEE_KEY, JSON.stringify(next))
  }

  async function saveCoffeeSettings() {
    const next: CoffeeConfig = {
      ...coffee,
      name:     coffeeNameDraft.trim() || 'Coffee',
      calories: Number(coffeeCalDraft) || 0,
    }
    setCoffee(next)
    await AsyncStorage.setItem(COFFEE_KEY, JSON.stringify(next))
    Alert.alert('Saved', 'Coffee settings updated.')
  }

  function signOut() {
    const doSignOut = () => supabase.auth.signOut()
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of Bumpling?')) doSignOut()
    } else {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doSignOut },
      ])
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>More</Text>

        {/* Navigation */}
        <View style={styles.section}>
          {NAV_ITEMS.map(item => (
            <NavRow key={item.label} item={item} onPress={() => router.push(item.route as any)} />
          ))}
        </View>

        {/* Coffee settings */}
        <Text style={styles.sectionLabel}>Quick Logging</Text>
        <View style={[styles.section, styles.coffeeCard]}>
          <View style={styles.coffeeHeader}>
            <View style={styles.rowIcon}>
              <Ionicons name="cafe-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Coffee quick-add</Text>
              <Text style={styles.rowDesc}>Show coffee card in diary</Text>
            </View>
            <Switch
              value={coffee.enabled}
              onValueChange={toggleCoffee}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.coffeeFields}>
            <View style={styles.coffeeField}>
              <Text style={styles.fieldLabel}>Drink name</Text>
              <TextInput
                style={styles.fieldInput}
                value={coffeeNameDraft}
                onChangeText={setCoffeeNameDraft}
                placeholder="e.g. Oat milk latte"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.coffeeField}>
              <Text style={styles.fieldLabel}>Calories per cup</Text>
              <TextInput
                style={styles.fieldInput}
                value={coffeeCalDraft}
                onChangeText={setCoffeeCalDraft}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveCoffeeSettings}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.row, styles.signOutRow]} onPress={signOut} activeOpacity={0.7}>
            <View style={[styles.rowIcon, styles.signOutIcon]}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  scroll:       { paddingHorizontal: spacing.md, paddingBottom: 40 },

  title:        { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xs },

  section:      { marginBottom: spacing.sm },

  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, gap: 12 },
  rowIcon:      { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  rowText:      { flex: 1 },
  rowLabel:     { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  rowDesc:      { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  coffeeCard:   { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
  coffeeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coffeeFields: { marginTop: spacing.sm, gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  coffeeField:  { gap: 5 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  fieldInput:   { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, color: colors.textPrimary },
  saveBtn:      { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  signOutRow:   { marginTop: spacing.xs },
  signOutIcon:  { backgroundColor: '#FEE2E2' },
  signOutText:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#EF4444' },
})
