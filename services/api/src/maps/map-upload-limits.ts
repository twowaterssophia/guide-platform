function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getMapUploadLimits() {
  const pcdBytes = positiveInteger(process.env.MAP_MAX_PCD_BYTES, 200 * 1024 * 1024)
  const previewBytes = positiveInteger(process.env.MAP_MAX_PREVIEW_BYTES, 20 * 1024 * 1024)
  const metadataBytes = positiveInteger(process.env.MAP_MAX_METADATA_BYTES, 256 * 1024)
  return {
    pcdBytes,
    previewBytes,
    metadataBytes,
    // The archive may be stored without compression, so it must accommodate
    // the complete validated bundle rather than an arbitrary small ZIP limit.
    bundleBytes: positiveInteger(process.env.MAP_MAX_BUNDLE_BYTES, pcdBytes + previewBytes + metadataBytes),
  }
}
