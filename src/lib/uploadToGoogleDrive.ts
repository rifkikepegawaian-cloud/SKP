/**
 * Uploads a file to Google Drive via Google Apps Script Web App.
 * Returns the public URL of the uploaded file.
 *
 * @param file - The File object from an <input type="file"> element
 * @param subfolder - Subfolder name in Drive (e.g. 'logbook', 'iku', 'skp')
 * @returns Promise<{ url: string; viewUrl: string; fileName: string }>
 */
export async function uploadToGoogleDrive(
  file: File,
  subfolder: string = 'logbook'
): Promise<{ url: string; viewUrl: string; fileName: string }> {
  const GAS_URL = process.env.NEXT_PUBLIC_GAS_UPLOAD_URL

  if (!GAS_URL) {
    throw new Error('NEXT_PUBLIC_GAS_UPLOAD_URL belum dikonfigurasi di .env.local')
  }

  // Convert file to base64
  const base64 = await fileToBase64(file)

  const payload = {
    file: base64,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    subfolder,
  }

  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    // Note: GAS Web App tidak support custom headers dari browser karena CORS,
    // tapi POST dengan body JSON tetap berfungsi
  })

  if (!response.ok) {
    throw new Error(`Upload gagal: HTTP ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Upload ke Google Drive gagal')
  }

  return {
    url: result.url,
    viewUrl: result.viewUrl,
    fileName: result.fileName,
  }
}

/**
 * Converts a File object to a base64 string (without the data: prefix).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Remove the "data:mime/type;base64," prefix
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}
