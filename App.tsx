import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

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

type NormalizedLocationEvent = {
  type: "location";
  source: "expo-location";
  timestamp: string;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
};

type BackgroundLocationTaskData = {
  locations?: Location.LocationObject[];
};

const BACKGROUND_LOCATION_TASK = "jupiter-background-location-task";
const MAX_LOCATION_HISTORY_ITEMS = 5;

function msToMinutes(ms: number) {
  return Math.round(ms / 1000 / 60);
}

// Converts Expo Location objects into the timeline-friendly event shape.
function normalizeLocationEvent(
  location: Location.LocationObject
): NormalizedLocationEvent {
  return {
    type: "location",
    source: "expo-location",
    timestamp: new Date(location.timestamp).toISOString(),
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    },
  };
}

function formatPermissionStatus(
  permission: Location.LocationPermissionResponse | Location.PermissionResponse
) {
  return `${permission.status} (${permission.granted ? "concedido" : "no concedido"})`;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatAccuracy(accuracy: number | null) {
  return accuracy === null ? "No disponible" : `${Math.round(accuracy)} m`;
}

function formatReadableTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

// The background task must be defined in the global scope so Android can run it
// when the app is woken up in the background.
TaskManager.defineTask<BackgroundLocationTaskData>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error("[Location background task] Error:", error.message);
      return;
    }

    const normalizedLocations = (data.locations ?? []).map(normalizeLocationEvent);

    if (normalizedLocations.length > 0) {
      console.log("[Location background task] Locations:", normalizedLocations);
    }
  }
);

export default function App() {
  const [permissionStatus, setPermissionStatus] = useState("Sin comprobar");
  const [message, setMessage] = useState("");
  const [usageStats, setUsageStats] = useState<UsageItem[]>([]);
  const [foregroundLocationPermission, setForegroundLocationPermission] =
    useState("Sin comprobar");
  const [backgroundLocationPermission, setBackgroundLocationPermission] =
    useState("Sin comprobar");
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [lastLocation, setLastLocation] =
    useState<NormalizedLocationEvent | null>(null);
  const [locationHistory, setLocationHistory] = useState<NormalizedLocationEvent[]>(
    []
  );
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);
  const [isBackgroundLocationRegistered, setIsBackgroundLocationRegistered] =
    useState(false);
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    refreshLocationPermissionStatus();
    checkBackgroundLocationTask();

    return () => {
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, []);

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
      setMessage("Error leyendo estadisticas de uso.");
    }
  }

  function addLocationToHistory(location: Location.LocationObject) {
    const normalizedLocation = normalizeLocationEvent(location);

    setLastLocation(normalizedLocation);
    setLocationHistory((currentHistory) =>
      [normalizedLocation, ...currentHistory].slice(0, MAX_LOCATION_HISTORY_ITEMS)
    );
  }

  async function refreshLocationPermissionStatus() {
    try {
      const [foregroundPermission, backgroundPermission] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      setForegroundLocationPermission(formatPermissionStatus(foregroundPermission));
      setBackgroundLocationPermission(formatPermissionStatus(backgroundPermission));
    } catch (error) {
      console.error(error);
      setLocationError(`Error comprobando permisos de ubicacion: ${formatError(error)}`);
    }
  }

  async function ensureForegroundLocationPermission() {
    setLocationError("");

    try {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      setForegroundLocationPermission(formatPermissionStatus(currentPermission));

      if (currentPermission.granted) {
        return true;
      }

      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      setForegroundLocationPermission(formatPermissionStatus(requestedPermission));

      if (!requestedPermission.granted) {
        setLocationError("Permiso de ubicacion en primer plano denegado.");
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      setLocationError(`Error pidiendo permiso foreground: ${formatError(error)}`);
      return false;
    }
  }

  async function ensureBackgroundLocationPermission() {
    setLocationError("");

    try {
      const currentPermission = await Location.getBackgroundPermissionsAsync();
      setBackgroundLocationPermission(formatPermissionStatus(currentPermission));

      if (currentPermission.granted) {
        return true;
      }

      const requestedPermission = await Location.requestBackgroundPermissionsAsync();
      setBackgroundLocationPermission(formatPermissionStatus(requestedPermission));

      if (!requestedPermission.granted) {
        setLocationError(
          "Permiso de ubicacion en segundo plano denegado. En Android puede requerir activarlo desde Ajustes."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      setLocationError(`Error pidiendo permiso background: ${formatError(error)}`);
      return false;
    }
  }

  // Reads one foreground location sample and stores it in the same normalized
  // format that the future Jupiter timeline can consume.
  async function getCurrentLocation() {
    const hasForegroundPermission = await ensureForegroundLocationPermission();

    if (!hasForegroundPermission) {
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      addLocationToHistory(location);
      setLocationError("");
      setLocationMessage("Ubicacion actual recibida.");
    } catch (error) {
      console.error(error);
      setLocationError(`Error obteniendo ubicacion actual: ${formatError(error)}`);
    }
  }

  // Starts foreground tracking with watchPositionAsync and keeps only the latest
  // few samples on screen to make the test easy to read.
  async function startForegroundLocationWatch() {
    if (watchSubscriptionRef.current) {
      setLocationMessage("El seguimiento en primer plano ya esta activo.");
      return;
    }

    const hasForegroundPermission = await ensureForegroundLocationPermission();

    if (!hasForegroundPermission) {
      return;
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (location) => {
          addLocationToHistory(location);
          setLocationMessage("Nueva ubicacion recibida por seguimiento.");
          setLocationError("");
        },
        (error) => {
          setLocationError(`Error en seguimiento foreground: ${error}`);
        }
      );

      watchSubscriptionRef.current = subscription;
      setIsWatchingLocation(true);
      setLocationError("");
      setLocationMessage("Seguimiento en primer plano iniciado.");
    } catch (error) {
      console.error(error);
      setLocationError(`Error iniciando seguimiento: ${formatError(error)}`);
    }
  }

  function stopForegroundLocationWatch() {
    watchSubscriptionRef.current?.remove();
    watchSubscriptionRef.current = null;
    setIsWatchingLocation(false);
    setLocationMessage("Seguimiento en primer plano detenido.");
  }

  // Background location depends on native Android permissions and the
  // expo-location config plugin. If app.json or AndroidManifest.xml changes,
  // rebuild the Development Build with `npx expo run:android`.
  async function startBackgroundLocation() {
    const isTaskManagerAvailable = await TaskManager.isAvailableAsync();

    if (!isTaskManagerAvailable) {
      setLocationError("TaskManager no esta disponible en esta build.");
      return;
    }

    const hasForegroundPermission = await ensureForegroundLocationPermission();

    if (!hasForegroundPermission) {
      return;
    }

    const hasBackgroundPermission = await ensureBackgroundLocationPermission();

    if (!hasBackgroundPermission) {
      return;
    }

    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,
        distanceInterval: 25,
        foregroundService: {
          notificationTitle: "Jupiter location test",
          notificationBody: "Capturando ubicacion para la prueba tecnica.",
          notificationColor: "#2563eb",
        },
      });

      await checkBackgroundLocationTask();
      setLocationError("");
      setLocationMessage(
        "Ubicacion en segundo plano iniciada. Revisa Metro/Logcat para ver los logs de la task."
      );
    } catch (error) {
      console.error(error);
      setLocationError(`Error iniciando background location: ${formatError(error)}`);
    }
  }

  async function stopBackgroundLocation() {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      await checkBackgroundLocationTask();
      setLocationError("");
      setLocationMessage("Ubicacion en segundo plano detenida.");
    } catch (error) {
      console.error(error);
      setLocationError(`Error deteniendo background location: ${formatError(error)}`);
    }
  }

  async function checkBackgroundLocationTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );

      setIsBackgroundLocationRegistered(isRegistered);
      setLocationMessage(
        `Background task ${isRegistered ? "registrada" : "no registrada"}.`
      );
    } catch (error) {
      console.error(error);
      setLocationError(`Error comprobando background task: ${formatError(error)}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={usageStats}
        keyExtractor={(item) => item.packageName}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text style={styles.title}>Jupiter UsageStats Test</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>UsageStatsManager</Text>
              <Text style={styles.text}>Permiso: {permissionStatus}</Text>

              <View style={styles.buttons}>
                <Button title="Comprobar permiso" onPress={checkPermission} />
                <Button
                  title="Abrir ajustes de permiso"
                  onPress={openPermissionSettings}
                />
                <Button title="Cargar uso ultimas 24h" onPress={loadUsageStats} />
              </View>

              <Text style={styles.message}>{message}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location Test</Text>
              <Text style={styles.text}>
                Permiso foreground: {foregroundLocationPermission}
              </Text>
              <Text style={styles.text}>
                Permiso background: {backgroundLocationPermission}
              </Text>
              <Text style={styles.text}>
                Background task:{" "}
                {isBackgroundLocationRegistered ? "registrada" : "no registrada"}
              </Text>
              <Text style={styles.text}>
                Seguimiento foreground: {isWatchingLocation ? "activo" : "detenido"}
              </Text>

              <View style={styles.buttons}>
                <Button
                  title="Obtener ubicacion actual"
                  onPress={getCurrentLocation}
                />
                <Button
                  title="Iniciar seguimiento"
                  onPress={startForegroundLocationWatch}
                  disabled={isWatchingLocation}
                />
                <Button
                  title="Detener seguimiento"
                  onPress={stopForegroundLocationWatch}
                  disabled={!isWatchingLocation}
                />
                <Button
                  title="Iniciar ubicacion en segundo plano"
                  onPress={startBackgroundLocation}
                />
                <Button
                  title="Detener ubicacion en segundo plano"
                  onPress={stopBackgroundLocation}
                />
                <Button
                  title="Comprobar background task"
                  onPress={checkBackgroundLocationTask}
                />
              </View>

              {locationMessage ? (
                <Text style={styles.message}>{locationMessage}</Text>
              ) : null}
              {locationError ? (
                <Text style={styles.errorMessage}>{locationError}</Text>
              ) : null}

              <View style={styles.locationBox}>
                <Text style={styles.subTitle}>Ultima ubicacion recibida</Text>
                {lastLocation ? (
                  <View style={styles.locationDetails}>
                    <Text>Latitud: {lastLocation.coords.latitude.toFixed(6)}</Text>
                    <Text>Longitud: {lastLocation.coords.longitude.toFixed(6)}</Text>
                    <Text>
                      Precision: {formatAccuracy(lastLocation.coords.accuracy)}
                    </Text>
                    <Text>
                      Timestamp: {formatReadableTimestamp(lastLocation.timestamp)}
                    </Text>
                    <Text selectable style={styles.codeBlock}>
                      {JSON.stringify(lastLocation, null, 2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.mutedText}>Sin ubicacion recibida.</Text>
                )}
              </View>

              <View style={styles.locationBox}>
                <Text style={styles.subTitle}>Historial de ultimas ubicaciones</Text>
                {locationHistory.length > 0 ? (
                  locationHistory.map((location, index) => (
                    <View
                      key={`${location.timestamp}-${index}`}
                      style={styles.historyItem}
                    >
                      <Text>
                        {formatReadableTimestamp(location.timestamp)} -{" "}
                        {location.coords.latitude.toFixed(6)},{" "}
                        {location.coords.longitude.toFixed(6)}
                      </Text>
                      <Text>
                        Precision: {formatAccuracy(location.coords.accuracy)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>Sin historial todavia.</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Uso de aplicaciones</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.mutedText}>Sin datos de uso cargados.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.packageName}>{item.packageName}</Text>
            <Text>
              Tiempo en primer plano: {msToMinutes(item.totalTimeInForeground)} min
            </Text>
            <Text>Ultimo uso: {new Date(item.lastTimeUsed).toLocaleString()}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  headerContent: {
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  section: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
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
  errorMessage: {
    color: "#b00020",
    fontWeight: "600",
    marginVertical: 8,
  },
  mutedText: {
    color: "#666666",
  },
  locationBox: {
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  locationDetails: {
    gap: 4,
  },
  codeBlock: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f4f4f5",
    fontFamily: Platform.select({
      android: "monospace",
      ios: "Menlo",
      default: "monospace",
    }),
    fontSize: 12,
  },
  historyItem: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
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
