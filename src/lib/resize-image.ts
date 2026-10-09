/** Smanjuje sliku u browseru (max stranica u px) i vraća base64 JPEG bez "data:" prefiksa. */
export async function resizeImage(file: File, max = 1280, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { mimeType: "image/jpeg" as const, data: dataUrl.split(",")[1], preview: dataUrl };
}
