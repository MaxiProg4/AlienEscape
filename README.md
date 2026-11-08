# Alien Escape

## Versión web

Abre `HTMLPage1.html` en un navegador o sirve la carpeta con un servidor web.

## Versión portable para Windows

Requiere Node.js 20 o posterior:

```powershell
npm install
npm run dist
```

El ejecutable se genera en `release/Alien-Escape-Portable-2.0.0.exe`.

## Discord RPC

1. Crea una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications).
2. Copia su **Application ID**.
3. Inicia el juego portable con la variable `DISCORD_CLIENT_ID`:

```powershell
$env:DISCORD_CLIENT_ID = "TU_APPLICATION_ID"
npm start
```

Discord debe estar abierto. La versión web no puede usar RPC local por las restricciones del navegador, pero el juego seguirá funcionando normalmente.

## Spotify: canción actual

La integración muestra la portada, el título y el artista de la canción que se está reproduciendo en Spotify, tanto en el menú como durante la partida.

1. Crea una aplicación en el [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Copia el **Client ID**.
3. En **Redirect URIs**, añade exactamente:
   `http://127.0.0.1:5500/HTMLPage1.html`
4. Abre `spotify-config.js` y completa `clientId` manteniendo ese `redirectUri`.
5. Sirve la carpeta con un servidor local en el puerto 5500. Por ejemplo, con VS Code Live Server o:

```powershell
npx serve -l 5500 .
```

6. En la versión web, abre `http://127.0.0.1:5500/HTMLPage1.html`, pulsa **CONECTAR SPOTIFY** e inicia sesión. La aplicación portable inicia automáticamente su propio servidor local en ese mismo puerto.

La autenticación usa OAuth PKCE: no se guarda ni se solicita un Client Secret. Spotify debe estar reproduciendo una canción y la cuenta debe tener acceso a la reproducción para que la API devuelva el estado actual. Si el puerto 5500 está ocupado, cambia el `redirectUri` y el puerto de `electron/main.js` por el mismo valor y vuelve a registrarlo en Spotify.
