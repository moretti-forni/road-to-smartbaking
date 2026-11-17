/** URL for a bundled public asset. */
export function publicPath(path: string) {
  return '/' + path.replace(/^\//, '');
}
