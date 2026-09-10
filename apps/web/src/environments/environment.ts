export const environment = {
  production: true,
  apiUrl: '/api',
  /**
   * Until apps/api exists the catalogue ships as a static file from public/.
   * Once the backend lands this becomes `${apiUrl}/streams`.
   */
  catalogueUrl: '/streams.json',
};
