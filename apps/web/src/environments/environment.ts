export const environment = {
  production: true,
  apiUrl: '/api',
  /**
   * Until apps/api exists the catalogue ships as a static file from public/.
   * Once the backend lands this becomes `${apiUrl}/streams`.
   *
   * Relative, not `/streams.json`. GitLab Pages serves a project at
   * `/<project>/`, and a leading slash would send the request to the domain
   * root instead. A relative request resolves against the document base URI,
   * which is what `--base-href` sets at build time, so the same bundle works
   * at the root and under a subpath.
   */
  catalogueUrl: 'streams.json',
};
