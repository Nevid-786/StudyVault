import axios from 'axios'


export default class GoogleDriveService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
  }
 static createFolder = async (folderName) => {
    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },    
    });
    return response.json();
  }
  static async getAllDriveItems(accessToken) {
  const items = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      q: "trashed = false",
      pageSize: "1000",
      fields:
       "nextPageToken,files(id,name,mimeType,parents,modifiedTime,size,md5Checksum,webViewLink,appProperties)",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Drive listing failed: ${response.status}`);
    }

    const data = await response.json();
    items.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}



static uploadFile = async (
  parentId,
  file,
  accessToken,
  semester,
  subject,
  unit,
  lid,
  onProgress
) => {
  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [parentId], // Add folder ID here if needed
    appProperties: {
      semester: String(semester),
      subject: String(subject),
      unit: String(unit),
      lid: String(lid),
    },
  }

  // Create a resumable upload session
  const { headers } = await axios.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type':
          file.type || 'application/octet-stream',
        'X-Upload-Content-Length': file.size,
      },
    }
  )

  const sessionUrl = headers.location

  // Upload the actual file with progress
  const { data } = await axios.put(sessionUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })

  return data
}

 static async downloadFile(
  fileId,
  accessToken,
  onProgress,
  mimeType = "application/octet-stream"
) {
  if (!fileId) {
    throw new Error("No file ID received");
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const total = Number(
    response.headers.get("content-length")
  );

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    received += value.byteLength;

    onProgress?.({
      received,
      total: total || null,
      progress: total
        ? Math.min(
            100,
            Math.round((received / total) * 100)
          )
        : null,
    });
  }

  return new Blob(chunks, { type: mimeType });
}

}

