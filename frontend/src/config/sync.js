//to sync files with google drive

import GoogleDriveService from "../services/googleDrive"
import localDB from "./indexdb"


export const syncFilesWithGoogleDrive = async (
 
  accessToken
) => {
  const DFiles = []; // Files to download
  const UFiles = []; // Files to upload

  try {
    const driveFiles =
      await GoogleDriveService.getAllDriveItems(accessToken);

    const localFiles = await localDB.getallfile();

    // Map Drive files by their local ID
    const driveMap = new Map();

    for (const driveFile of driveFiles) {
      const lid = driveFile.appProperties?.lid;

      if (lid) {
        driveMap.set(lid, driveFile);
      }
    }

    // Map local files by their ID
    const localMap = new Map(
      localFiles.map((file) => [file.lid, file])
    );

    // Local files missing from Drive -> upload
    for (const localFile of localFiles) {
      if (!driveMap.has(localFile.lid)) {
        UFiles.push(localFile);
      }
    }

    // Drive files missing locally -> download
    for (const driveFile of driveFiles) {
      const lid = driveFile.appProperties?.lid;

      if (lid && !localMap.has(lid)) {
        DFiles.push(driveFile);
      }
    }

    console.log("Files to upload:", UFiles);
    console.log("Files to download:", DFiles);

    return { DFiles, UFiles };
  } catch (err) {
    console.error("Sync failed:", err);
    throw err;
  }
};
