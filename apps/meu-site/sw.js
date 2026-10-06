// Service Worker para Cache e Performance
const CACHE_NAME = 'aleksandro-portfolio-v1.0.0';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/about.html',
    '/portfolio.html',
    '/certificates.html',
    '/contact.html',
    '/linktree.html',
    '/styles.css',
    '/accessibility.css',
    '/script.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    // Só cachear requisições GET
    if (event.request.method !== 'GET') return;

    // Não cachear requisições externas críticas
    if (event.request.url.includes('analytics') ||
        event.request.url.includes('tracking')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retornar do cache se disponível
                if (response) {
                    return response;
                }

                // Clone da requisição
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Verificar se a resposta é válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone da resposta
                    const responseToCache = response.clone();

                    // Adicionar ao cache
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Fallback para páginas offline
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Background Sync para melhor performance
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Lógica de sincronização em background
            console.log('Background sync executado')
        );
    }
});

// Push Notifications (se necessário no futuro)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nova atualização disponível!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver detalhes',
                icon: '/checkmark.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Aleksandro Alves - Portfólio', options)
    );
});