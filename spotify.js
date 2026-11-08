const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1/me/player";
const SPOTIFY_SCOPES = "streaming user-read-currently-playing user-read-playback-state user-modify-playback-state";
const spotifyConfig = window.SPOTIFY_CONFIG || {};
const spotifyStorageKey = "alienSpotifyTokens";

let spotifyTokens = JSON.parse(localStorage.getItem(spotifyStorageKey) || "null");
let spotifyPoller = null;
let spotifyPlaybackPlayer = null;
let spotifyDeviceId = null;

function base64Url(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

document.addEventListener("spotify-sdk-ready", () => {
    initializePlayback();
});

function setSpotifyPlaybackButton(isPlaying) {
    document.querySelectorAll('[data-spotify-action="toggle"]').forEach(button => {
        button.textContent = isPlaying ? "Ⅱ PAUSAR SPOTIFY" : "▶ REPRODUCIR SPOTIFY";
    });
}

function randomString(length = 64) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
}

async function refreshSpotifyToken() {
    if (!spotifyTokens?.refresh_token) return null;

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: spotifyConfig.clientId,
            grant_type: "refresh_token",
            refresh_token: spotifyTokens.refresh_token
        })
    });

    if (!response.ok) return null;

    const refreshed = await response.json();
    spotifyTokens = {
        ...spotifyTokens,
        ...refreshed,
        refresh_token: refreshed.refresh_token || spotifyTokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000
    };
    localStorage.setItem(spotifyStorageKey, JSON.stringify(spotifyTokens));
    return spotifyTokens.access_token;
}

async function createChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64Url(digest);
}

function spotifyRedirectUri() {
    return spotifyConfig.redirectUri || window.location.href.split("?")[0];
}

function setSpotifyStatus(message, connected = false) {
    const status = document.getElementById("spotifyStatus");
    const buttons = document.querySelectorAll("[data-spotify-connect]");

    if (status) {
        status.textContent = message;
        status.classList.toggle("spotify-connected", connected);
    }

    buttons.forEach(button => {
        button.textContent = connected ? "DESCONECTAR SPOTIFY" : "CONECTAR SPOTIFY";
    });
}

function setSpotifyTrack(track) {
    const title = document.getElementById("spotifyTrack");
    const artist = document.getElementById("spotifyArtist");
    const cover = document.getElementById("spotifyCover");

    if (!track) {
        title.textContent = "Sin reproducción activa";
        artist.textContent = "Inicia una canción en Spotify";
        cover.removeAttribute("src");
        cover.classList.add("hidden");
        return;
    }

    title.textContent = track.item.name;
    artist.textContent = track.item.artists.map(artist => artist.name).join(", ");
    const image = track.item.album?.images?.[2]?.url || track.item.album?.images?.[0]?.url;

    if (image) {
        cover.src = image;
        cover.classList.remove("hidden");
    }
}

async function exchangeCode(code, verifier) {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: spotifyConfig.clientId,
            grant_type: "authorization_code",
            code,
            redirect_uri: spotifyRedirectUri(),
            code_verifier: verifier
        })
    });

    if (!response.ok) throw new Error("No se pudo completar el inicio de sesión de Spotify");
    return response.json();
}

async function handleSpotifyCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const verifier = sessionStorage.getItem("spotifyCodeVerifier");

    if (!code || !verifier) return;

    try {
        spotifyTokens = await exchangeCode(code, verifier);
        spotifyTokens.expires_at = Date.now() + spotifyTokens.expires_in * 1000;
        localStorage.setItem(spotifyStorageKey, JSON.stringify(spotifyTokens));
        sessionStorage.removeItem("spotifyCodeVerifier");
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        setSpotifyStatus(error.message);
    }
}

async function connectSpotify() {
    if (!spotifyConfig.clientId) {
        setSpotifyStatus("Configura tu Client ID en spotify-config.js");
        return;
    }

    const verifier = randomString();
    const challenge = await createChallenge(verifier);
    sessionStorage.setItem("spotifyCodeVerifier", verifier);

    const params = new URLSearchParams({
        client_id: spotifyConfig.clientId,
        response_type: "code",
        redirect_uri: spotifyRedirectUri(),
        scope: SPOTIFY_SCOPES,
        code_challenge_method: "S256",
        code_challenge: challenge
    });

    window.location.href = `${SPOTIFY_AUTH_URL}?${params}`;
}

function disconnectSpotify() {
    if (spotifyPlaybackPlayer) {
        spotifyPlaybackPlayer.disconnect();
        spotifyPlaybackPlayer = null;
        spotifyDeviceId = null;
    }
    spotifyTokens = null;
    localStorage.removeItem(spotifyStorageKey);
    setSpotifyStatus("Spotify desconectado");
    setSpotifyTrack(null);
    if (spotifyPoller) clearInterval(spotifyPoller);
}

async function getValidToken() {
    if (!spotifyTokens) return null;
    if (spotifyTokens.expires_at && Date.now() >= spotifyTokens.expires_at - 60000) {
        const refreshedToken = await refreshSpotifyToken();
        if (refreshedToken) return refreshedToken;
        disconnectSpotify();
        return null;
    }
    return spotifyTokens.access_token;
}

async function updateSpotifyTrack() {
    const token = await getValidToken();
    if (!token) return;

    const response = await fetch(SPOTIFY_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 204) {
        setSpotifyStatus("Conectado · sin reproducción activa", true);
        setSpotifyTrack(null);
        return;
    }

    if (response.status === 401) {
        disconnectSpotify();
        return;
    }

    if (!response.ok) return;

    const track = await response.json();
    setSpotifyStatus(track.is_playing ? "Escuchando ahora" : "Spotify pausado", true);
    setSpotifyPlaybackButton(track.is_playing);
    setSpotifyTrack(track.item ? track : null);
}

async function activateSpotifyDevice() {
    const token = await getValidToken();
    if (!token || !spotifyDeviceId) return false;

    const response = await fetch(SPOTIFY_API_URL, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false })
    });

    return response.ok;
}

function initializePlayback() {
    if (!spotifyTokens || spotifyPlaybackPlayer || !window.Spotify) return;

    spotifyPlaybackPlayer = new Spotify.Player({
        name: "Alien Escape",
        getOAuthToken: callback => getValidToken().then(callback),
        volume: 0.6
    });

    spotifyPlaybackPlayer.addListener("ready", async ({ device_id }) => {
        spotifyDeviceId = device_id;
        setSpotifyStatus("Spotify listo para reproducir", true);
        await activateSpotifyDevice();
    });

    spotifyPlaybackPlayer.addListener("not_ready", () => {
        spotifyDeviceId = null;
        setSpotifyStatus("Spotify no está disponible", false);
    });

    spotifyPlaybackPlayer.addListener("player_state_changed", state => {
        if (!state) return;
        setSpotifyPlaybackButton(!state.paused);
        setSpotifyStatus(state.paused ? "Spotify pausado" : "Escuchando ahora", true);
        setSpotifyTrack(state.track_window?.current_track ? {
            item: state.track_window.current_track
        } : null);
    });

    spotifyPlaybackPlayer.addListener("initialization_error", ({ message }) => {
        setSpotifyStatus(`Error de Spotify: ${message}`);
    });

    spotifyPlaybackPlayer.addListener("authentication_error", ({ message }) => {
        setSpotifyStatus(`Error de autenticación: ${message}`);
    });

    spotifyPlaybackPlayer.addListener("account_error", () => {
        setSpotifyStatus("Necesitas Spotify Premium para reproducir aquí");
    });

    spotifyPlaybackPlayer.connect();
}

async function toggleSpotifyPlayback() {
    if (!spotifyPlaybackPlayer || !spotifyDeviceId) {
        setSpotifyStatus("Conecta Spotify y espera a que el reproductor esté listo");
        return;
    }

    await spotifyPlaybackPlayer.togglePlay();
}

async function skipSpotifyTrack() {
    if (spotifyPlaybackPlayer) await spotifyPlaybackPlayer.nextTrack();
}

async function startSpotify() {
    await handleSpotifyCallback();

    if (!spotifyTokens) {
        setSpotifyStatus(spotifyConfig.clientId
            ? "Spotify no conectado"
            : "Configura tu Client ID en spotify-config.js");
        setSpotifyTrack(null);
        return;
    }

    await updateSpotifyTrack();
    spotifyPoller = setInterval(updateSpotifyTrack, 15000);
    initializePlayback();
}

document.querySelectorAll("[data-spotify-connect]").forEach(button => {
    button.onclick = () => {
        if (spotifyTokens) disconnectSpotify();
        else connectSpotify();
    };
});

document.querySelectorAll('[data-spotify-action="toggle"]').forEach(button => {
    button.onclick = toggleSpotifyPlayback;
});

document.querySelectorAll('[data-spotify-action="next"]').forEach(button => {
    button.onclick = skipSpotifyTrack;
});

window.spotifyPlayer = {
    start: startSpotify,
    update: updateSpotifyTrack,
    initializePlayback
};

