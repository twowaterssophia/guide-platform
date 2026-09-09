function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getMapUploadLimits() {
  return {
    pcdBytes: positiveInteger(process.env.MAP_MAX_PCD_BYTES, 200 * 1024 * 1024),
    previewBytes: positiveInteger(process.env.MAP_MAX_PREVIEW_BYTES, 20 * 1024 * 1024),
    metadataBytes: positiveInteger(process.env.MAP_MAX_METADATA_BYTES, 256 * 1024),
  }
}
