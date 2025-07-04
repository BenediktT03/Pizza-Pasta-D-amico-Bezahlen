import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, SafeAreaView } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚀 EATECH Mobile</Text>
        <Text style={styles.subtitle}>Foodtruck Bestellsystem</Text>
        <Text style={styles.info}>Die App läuft erfolgreich!</Text>
        <StatusBar style="light" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "#FF6B6B",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#4ECDC4",
    fontSize: 20,
    marginBottom: 20,
  },
  info: {
    color: "#FFF",
    fontSize: 16,
  },
});
