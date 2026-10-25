const GOOGLE_FOLDER_NAME = process.env.GOOGLE_FOLDER_NAME || "Study_Vault";

const getOrCreateFolder = async (
  accessToken,
  folderName = GOOGLE_FOLDER_NAME,
  parentId = null
) => {
  if (!accessToken) {
    throw new TypeError("A Google access token is required to access Drive");
  }

  const escapedName = folderName
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
  let query =
    `name = '${escapedName}' and ` +
    "mimeType = 'application/vnd.google-apps.folder' and " +
    "trashed = false";

  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const searchParams = new URLSearchParams({
    q: query,
    fields: "files(id, name)",
    pageSize: "100",
  });
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?${searchParams}`,
    { headers }
  );

  if (!searchResponse.ok) {
    throw new Error(`Google Drive folder search failed (${searchResponse.status})`);
  }

  const { files = [] } = await searchResponse.json();
  if (files.length > 0) {
    return files[0].id;
  }

  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const createParams = new URLSearchParams({ fields: "id, name" });
  const createResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?${createParams}`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!createResponse.ok) {
    throw new Error(`Google Drive folder creation failed (${createResponse.status})`);
  }

  const createdFolder = await createResponse.json();
  if (!createdFolder.id) {
    throw new Error("Google Drive did not return the created folder ID");
  }

  return createdFolder.id;
};

export default getOrCreateFolder;
