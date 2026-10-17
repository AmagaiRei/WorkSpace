//! Модуль для работы с GitHub API и кэшированием данных

const GITHUB_API_BASE =
   'https://api.github.com/repos/AmagaiRei/WorkSpace/contents';
const CACHE_PREFIX = 'github_cache_';
const CACHE_DURATION = 3600000; // 1 час в миллисекундах

/**
 * Получает данные из кэша localStorage
 * @param {string} key - Ключ кэша
 * @returns {object|null} - Кэшированные данные или null
 */
function getFromCache(key) {
   try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Проверяем, не истёк ли срок кэша
      if (Date.now() - timestamp > CACHE_DURATION) {
         localStorage.removeItem(CACHE_PREFIX + key);
         return null;
      }

      return data;
   } catch (error) {
      console.warn('Ошибка чтения кэша:', error);
      return null;
   }
}

/**
 * Сохраняет данные в кэш localStorage
 * @param {string} key - Ключ кэша
 * @param {any} data - Данные для сохранения
 */
function saveToCache(key, data) {
   try {
      localStorage.setItem(
         CACHE_PREFIX + key,
         JSON.stringify({
            data,
            timestamp: Date.now(),
         }),
      );
   } catch (error) {
      console.warn('Ошибка записи в кэш:', error);
   }
}

/**
 * Делает запрос к GitHub API с кэшированием
 * @param {string} endpoint - Путь относительно репозитория (например, 'data/labs')
 * @returns {Promise<any>} - Данные с GitHub
 */
export async function fetchFromGitHub(endpoint) {
   const cacheKey = endpoint;

   //! 1. Пытаемся получить из кэша
   const cached = getFromCache(cacheKey);
   if (cached) {
      console.log(`✓ Данные из кэша: ${endpoint}`);
      return cached;
   }

   //! 2. Если в кэше нет — делаем запрос к API
   try {
      const url = `${GITHUB_API_BASE}/${endpoint}`;
      console.log(`↓ Запрос к GitHub API: ${endpoint}`);

      const response = await fetch(url, {
         headers: {
            Accept: 'application/vnd.github.v3+json',
         },
      });

      if (!response.ok) {
         throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`,
         );
      }

      const data = await response.json();

      //! 3. Сохраняем в кэш
      saveToCache(cacheKey, data);

      return data;
   } catch (error) {
      console.error(`✗ Ошибка загрузки с GitHub (${endpoint}):`, error);
      throw error;
   }
}

/**
 * ?Получает список лабораторных работ из папки data/labs
 * @returns {Promise<Array>} - Массив объектов с информацией о лабораторных
 */

export async function fetchLabsFromGitHub() {
   const labs = [];

   async function walkDirectory(path) {
      const contents = await fetchFromGitHub(path);

      if (!Array.isArray(contents)) {
         throw new Error(`GitHub вернул неожиданный формат для ${path}.`);
      }

      const directories = contents.filter((item) => item.type === 'dir');

      for (const item of directories) {
         if (/^lab-\d+$/i.test(item.name)) {
            labs.push({
               name: item.name,
               path: item.path,
               lastUpdated: item.commit?.author?.date || null,
               url: item.html_url,
            });
         } else {
            await walkDirectory(item.path);
         }
      }
   }

   await walkDirectory('data/labs');
   return labs;
}

/**
 * Получает содержимое README.md из папки лабораторной работы
 * @param {string} labPath - Путь к лабораторной (например, 'data/labs/databases/lab-01')
 * @returns {Promise<{found: boolean, title: string, description: string}>}
 * !found=true только если README реально скачан и в нём есть текст.
 * !При found=false title/description — заглушки, подставлять их на сайт нельзя.
 */
export async function fetchLabReadme(labPath) {
   const folderName = labPath.split('/').pop();
   const notFound = (description) => ({
      found: false,
      title: folderName,
      description,
   });

   try {
      const contents = await fetchFromGitHub(labPath);

      //! Ищем README.md
      const readme = contents.find(
         (file) => file.name.toLowerCase() === 'readme.md',
      );
      if (!readme) return notFound('Описание отсутствует');

      //! Получаем содержимое README
      const response = await fetch(readme.download_url);
      if (!response.ok) {
         throw new Error(`README: ${response.status} ${response.statusText}`);
      }
      const markdown = await response.text();

      //! Извлекаем заголовок и краткое описание
      const lines = markdown.split('\n').filter((line) => line.trim());
      if (lines.length === 0) return notFound('Описание отсутствует'); //! пустой README

      const title = lines[0].replace(/^#+\s*/, '').trim();
      const description = lines
         .slice(1, 4)
         .filter((line) => !line.startsWith('#'))
         .join(' ')
         .substring(0, 150);

      //! description может быть пустым: тогда на сайте останется текст из subjects.json
      return { found: true, title: title || folderName, description };
   } catch (error) {
      console.warn(`Не удалось загрузить README для ${labPath}:`, error);
      return notFound('Описание недоступно');
   }
}

/**
 * !Очищает весь кэш GitHub (полезно для отладки)
 */
export function clearGitHubCache() {
   Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
   console.log('✓ Кэш GitHub очищен');
}
