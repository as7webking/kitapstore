export function isChunkError(error) {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(`${error?.name || ''} ${error?.message || ''}`);
}

