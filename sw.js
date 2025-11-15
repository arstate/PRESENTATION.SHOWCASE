const CACHE_NAME = 'arstate-apps-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/types.ts',
  '/App.tsx',
  '/components/SlideCard.tsx',
  '/components/SlideViewer.tsx',
  '/apps/HomeScreen.tsx',
  '/apps/PresentationShowcaseApp.tsx',
  '/apps/ShortLinkGeneratorApp.tsx',
  '/apps/PDFMergerApp.tsx',
  '/apps/GooglePhotosEmbedderApp.tsx',
  '/apps/PDFCompressorApp.tsx',
  '/apps/MediaConverterApp.tsx',
  '/apps/RemoveBackgroundApp.tsx',
  '/apps/TextToImageApp.tsx',
  '/apps/ImageUpscalingApp.tsx',
  '/apps/auth/ShowcasePasswordPrompt.tsx',
  '/components/LoginScreen.tsx',
  '/components/AppHeader.tsx',
  '/components/LoginPromptModal.tsx',
  '/firebase.ts'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache files one by one to avoid a single failure from stopping the entire cache process.
        return Promise.all(
            URLS_TO_CACHE.map(url => {
                return cache.add(url).catch(reason => {
                    console.warn(`Failed to cache ${url}: ${reason}`);
                });
            })
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  // We only handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, fetch from network.
        return fetch(event.request);
      }
    )
  );
});
