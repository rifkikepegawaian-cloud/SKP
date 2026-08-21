/**
 * ============================================================
 * HRIS Smart-Performance — Google Apps Script File Upload Handler
 * Deploy sebagai Web App: Execute as "Me", Access "Anyone"
 * ============================================================
 * 
 * CARA DEPLOY:
 * 1. Buka script.google.com, buat project baru
 * 2. Tempel kode ini, ganti FOLDER_ID di bawah
 * 3. Klik Deploy → New Deployment → Web App
 * 4. Execute as: "Me", Who has access: "Anyone"
 * 5. Copy URL Web App yang dihasilkan ke .env.local sebagai NEXT_PUBLIC_GAS_UPLOAD_URL
 */

// === KONFIGURASI ===
// Ganti dengan ID folder Google Drive tujuan penyimpanan.
// Cara mendapatkan ID: buka folder di Drive, ambil bagian URL setelah /folders/
var FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_GOOGLE_DRIVE_ANDA';

/**
 * Handler untuk request POST (upload file)
 */
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var fileData = params.file;       // base64 string
    var fileName = params.filename;   // nama file asli
    var mimeType = params.mimeType;   // tipe file (image/jpeg, application/pdf, dsb)
    var subfolder = params.subfolder || 'logbook'; // subfolder: logbook / iku / skp

    // Decode base64
    var decoded = Utilities.base64Decode(fileData);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Cari / buat subfolder
    var rootFolder = DriveApp.getFolderById(FOLDER_ID);
    var targetFolder;
    var subfolderIterator = rootFolder.getFoldersByName(subfolder);
    if (subfolderIterator.hasNext()) {
      targetFolder = subfolderIterator.next();
    } else {
      targetFolder = rootFolder.createFolder(subfolder);
    }

    // Simpan file ke Drive
    var file = targetFolder.createFile(blob);

    // Buat file dapat diakses publik (siapapun dengan link)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Buat URL langsung yang bisa digunakan sebagai link download/preview
    var fileId = file.getId();
    var directUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
    var viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        fileId: fileId,
        url: directUrl,        // URL gambar langsung (untuk preview)
        viewUrl: viewUrl,      // URL halaman Drive
        fileName: fileName
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handler untuk request GET (health check / test)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'OK',
      service: 'HRIS Smart-Performance File Upload',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
