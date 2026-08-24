import { View, Text, StyleSheet } from 'react-native'

export default function ShoppingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
})
