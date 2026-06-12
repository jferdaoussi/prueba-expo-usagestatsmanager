import React, { useState } from "react";
import {
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  hasUsageStatsPermission,
  requestUsageStatsPermission,
  getUsageStats,
} from "expo-android-usagestats";

type UsageItem = {
  packageName: string;
  firstTimeStamp?: number;
  lastTimeStamp?: number;
  lastTimeUsed: number;
  totalTimeInForeground: number;
  totalTimeVisible?: number;
};

function msToMinutes(ms: number) {
  return Math.round(ms / 1000 / 60);
}

export default function App() {
  const [permissionStatus, setPermissionStatus] = useState("Sin comprobar");
  const [message, setMessage] = useState("");
  const [usageStats, setUsageStats] = useState<UsageItem[]>([]);

  async function checkPermission() {
    if (Platform.OS !== "android") {
      setMessage("Esta prueba solo funciona en Android.");
      return;
    }

    try {
      const granted = await hasUsageStatsPermission();
      setPermissionStatus(granted ? "Concedido" : "No concedido");
      setMessage(granted ? "Permiso concedido." : "Permiso no concedido.");
    } catch (error) {
      console.error(error);
      setMessage("Error comprobando el permiso.");
    }
  }

  async function openPermissionSettings() {
    if (Platform.OS !== "android") {
      setMessage("Esta prueba solo funciona en Android.");
      return;
    }

    try {
      await requestUsageStatsPermission();
      setMessage("Activa el permiso de acceso de uso y vuelve a la app.");
    } catch (error) {
      console.error(error);
      setMessage("Error abriendo ajustes.");
    }
  }

  async function loadUsageStats() {
    if (Platform.OS !== "android") {
      setMessage("Esta prueba solo funciona en Android.");
      return;
    }

    try {
      const granted = await hasUsageStatsPermission();

      if (!granted) {
        setPermissionStatus("No concedido");
        setMessage("Primero tienes que conceder el permiso.");
        return;
      }

      const now = Date.now();
      const yesterday = now - 24 * 60 * 60 * 1000;

      const stats = await getUsageStats(yesterday, now);

      const filteredStats = (stats as UsageItem[])
        .filter((item) => item.totalTimeInForeground > 0)
        .sort((a, b) => b.totalTimeInForeground - a.totalTimeInForeground);

      setUsageStats(filteredStats);
      setPermissionStatus("Concedido");
      setMessage(`Apps encontradas: ${filteredStats.length}`);
    } catch (error) {
      console.error(error);
      setMessage("Error leyendo estadísticas de uso.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Jupiter UsageStats Test</Text>

      <Text style={styles.text}>Permiso: {permissionStatus}</Text>

      <View style={styles.buttons}>
        <Button title="Comprobar permiso" onPress={checkPermission} />
        <Button title="Abrir ajustes de permiso" onPress={openPermissionSettings} />
        <Button title="Cargar uso últimas 24h" onPress={loadUsageStats} />
      </View>

      <Text style={styles.message}>{message}</Text>

      <FlatList
        data={usageStats}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.packageName}>{item.packageName}</Text>
            <Text>
              Tiempo en primer plano: {msToMinutes(item.totalTimeInForeground)} min
            </Text>
            <Text>
              Último uso: {new Date(item.lastTimeUsed).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
  },
  buttons: {
    gap: 10,
    marginVertical: 12,
  },
  message: {
    marginVertical: 12,
    fontWeight: "600",
  },
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  packageName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
});