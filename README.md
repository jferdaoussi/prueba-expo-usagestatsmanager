# Jupiter Usage Test

App de prueba creada con Expo Development Build para comprobar la lectura de datos de uso de apps en Android mediante `UsageStatsManager`.

## Requisitos

- Android Studio con un emulador Android creado, por ejemplo Pixel 8 API 34.
- Dependencias instaladas con `npm install`.

## Ejecutar

La primera vez, o si se cambian dependencias nativas, compila e instala la development build en el emulador:

```bash
npx expo run:android
```

Despues, para arrancar el servidor de desarrollo:

```bash
npx expo start --dev-client
```

## Como probar

1. Abre la app en Android.
2. Concede el permiso de acceso a datos de uso cuando se solicite. Si Android abre Ajustes, busca la app y activa el permiso de acceso de uso.
3. Vuelve a la app.
4. Pulsa el boton **"Recibir datos de uso de las ultimas 24h"**.
5. Deberian aparecer en pantalla los datos de uso de las aplicaciones de las ultimas 24 horas.

## Nota

Esta app es solo una prueba interna para validar la integracion con `UsageStatsManager`; no esta pensada como app final.
