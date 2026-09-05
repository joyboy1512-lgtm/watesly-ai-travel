/** Resize/compress passport photos before OCR upload (faster upload + AI). */
export async function compressPassportImage(
  file: File,
  maxWidth = 1600,
  quality = 0.88,
): Promise<{ base64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / Math.max(bitmap.width, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("تعذر معالجة الصورة");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    if (!base64) throw new Error("تعذر ضغط الصورة");
    return { base64, mimeType: "image/jpeg" };
  } catch {
    // Fallback for browsers that fail createImageBitmap (some mobile cameras).
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      reader.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    if (!base64) throw new Error("تعذر قراءة الصورة");
    const mimeType =
      file.type && file.type.startsWith("image/")
        ? file.type
        : "image/jpeg";
    return { base64, mimeType };
  }
}
