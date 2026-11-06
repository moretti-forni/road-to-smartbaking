/** Returns a URL relative to the configured application base path. */
export function publicPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
