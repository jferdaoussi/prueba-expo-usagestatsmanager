# Jupiter UsageStats Test

Prueba técnica del Proyecto Júpiter para comprobar si una app Android creada con Expo puede acceder a estadísticas de uso de aplicaciones mediante `UsageStatsManager`.

La app permite:

* comprobar si el permiso de acceso a uso está concedido;
* abrir los ajustes de Android para conceder el permiso;
* cargar el uso de apps de las últimas 24 horas;
* mostrar paquetes de apps, tiempo en primer plano y último uso.

---

## Requisitos

Cada miembro del equipo necesita tener instalado:

* Node.js
* npm
* Git
* Android Studio
* Android SDK
* Android Emulator o un móvil Android físico
* Java/JDK incluido con Android Studio

---

## Instalación

Clonar el repositorio:

```bash
git clone URL_DEL_REPOSITORIO
cd NOMBRE_DEL_PROYECTO
```

Instalar dependencias:

```bash
npm install
```

---

## Variables de entorno

Cada usuario debe adaptar las rutas según dónde tenga instalado su Android SDK, sus emuladores y Gradle.

Variables necesarias:

```text
ANDROID_HOME = ruta_al_android_sdk
ANDROID_SDK_ROOT = ruta_al_android_sdk
ANDROID_AVD_HOME = ruta_a_los_emuladores_android
GRADLE_USER_HOME = ruta_a_la_cache_de_gradle
JAVA_HOME = ruta_al_jdk_de_android_studio
```

También conviene añadir al `Path`:

```text
ruta_al_android_sdk/platform-tools
ruta_al_android_sdk/emulator
ruta_al_jdk_de_android_studio/bin
```

Ejemplo orientativo en Git Bash:

```bash
export ANDROID_HOME="/ruta/a/Android/Sdk"
export ANDROID_SDK_ROOT="/ruta/a/Android/Sdk"
export ANDROID_AVD_HOME="/ruta/a/Android/avd"
export GRADLE_USER_HOME="/ruta/a/.gradle"
export JAVA_HOME="/ruta/a/Android/Studio/jbr"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

En Windows, las variables pueden configurarse desde:

```text
Editar variables de entorno del sistema
→ Variables de entorno
→ Variables de usuario
```

---

## Ejecutar la app en Android

Antes de ejecutar la app, hay que tener encendido un emulador Android o conectar un móvil Android físico.

Comprobar que Android detecta el dispositivo:

```bash
adb devices
```

Debe aparecer algo parecido a:

```text
List of devices attached
emulator-5554   device
```

Ejecutar la app:

```bash
npx expo run:android
```

Este comando compila, instala y abre la app en el emulador o dispositivo Android.

---

## Iniciar el servidor de desarrollo

Una vez instalada la Development Build, se puede iniciar el servidor de desarrollo con:

```bash
npx expo start --dev-client
```

Después, abrir la app instalada en el emulador o dispositivo Android.

---

## Uso de la app

La pantalla principal tiene tres botones:

```text
Comprobar permiso
Abrir ajustes de permiso
Cargar uso últimas 24h
```

Pasos:

1. Pulsar **Abrir ajustes de permiso**.
2. Activar el permiso de acceso de uso para la app.
3. Volver a la app.
4. Pulsar **Comprobar permiso**.
5. Pulsar **Cargar uso últimas 24h**.

Si funciona correctamente, aparecerá una lista de aplicaciones usadas con:

* nombre técnico del paquete;
* tiempo en primer plano;
* último momento de uso.

Ejemplo:

```text
com.android.chrome
Tiempo en primer plano: 6 min
Último uso: 12/06/2026, 13:45
```

---

## Permiso Android necesario

La app utiliza el permiso:

```xml
<uses-permission 
  android:name="android.permission.PACKAGE_USAGE_STATS" 
  tools:ignore="ProtectedPermissions" />
```

Este permiso se encuentra declarado en:

```text
android/app/src/main/AndroidManifest.xml
```

El permiso no se concede mediante un popup normal. Hay que activarlo manualmente desde los ajustes de Android.

---

## Nota sobre Gradle

El proyecto está configurado con Gradle `8.14.3`.

Archivo:

```text
android/gradle/wrapper/gradle-wrapper.properties
```

Configuración:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip
```

No cambiar a Gradle 9, porque durante la prueba generó errores de compilación.

---

## Archivos principales

```text
App.tsx
package.json
android/app/src/main/AndroidManifest.xml
android/gradle/wrapper/gradle-wrapper.properties
```

---

## Conclusión de la prueba

La prueba confirma que la app puede acceder a estadísticas de uso de aplicaciones en Android usando una Development Build.

Resultado validado:

```text
Expo Development Build + expo-android-usagestats + UsageStatsManager funciona en Android.
```

Pendiente de validar:

```text
Probar la app en un dispositivo Android físico real.
```

