export const environment = {
  production: true,
  apiUrl: '/api',
  /**
   * Пока нет apps/api, каталог отдаётся статическим файлом из public/.
   * Когда появится бэкенд, здесь будет `${apiUrl}/streams`.
   */
  catalogueUrl: '/streams.json',
};
