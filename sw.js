// Service worker minimal pour PronosFoot.
// Rôle : (1) satisfaire le critère d'installabilité "Ajouter à l'écran d'accueil" des
// navigateurs (qui exigent un service worker actif avec un gestionnaire fetch), et
// (2) garder une copie de la page principale pour un minimum de résilience hors-ligne
// (l'interface s'affiche même sans réseau, même si les données Firestore ne peuvent
// évidemment pas se charger sans connexion).
//
// Volontairement minimal : ne met en cache QUE la page HTML elle-même, jamais les
// requêtes vers Firebase/Firestore/Auth (toujours en direct, jamais depuis un cache,
// pour ne jamais afficher un score ou un classement périmé).

const CACHE_NAME = 'pronosfoot-shell-v1';
const APP_SHELL_URL = './';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.add(APP_SHELL_URL))
            .catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // On ne gère que la navigation vers la page elle-même (GET). Tout le reste (Firebase,
    // polices, CDN) part directement au réseau, sans jamais passer par ce cache.
    if (event.request.method !== 'GET' || event.request.mode !== 'navigate') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
