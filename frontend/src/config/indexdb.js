const DATABASE_NAME = 'studyVault'
const BACKUP_FORMAT = 'study-vault-backup'
const BACKUP_VERSION = 1
const APP_SETTINGS = ['destination']

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return btoa(binary)
}

const fromBase64 = (value) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

const encodeValue = async (value) => {
  if (value === undefined) return { __studyVaultType: 'undefined' }
  if (value instanceof Date) return { __studyVaultType: 'date', value: value.toISOString() }
  if (value instanceof Blob) {
    const encoded = {
      __studyVaultType: 'blob',
      type: value.type,
      data: toBase64(await value.arrayBuffer()),
    }

    if (typeof File !== 'undefined' && value instanceof File) {
      return {
        ...encoded,
        __studyVaultType: 'file',
        name: value.name,
        lastModified: value.lastModified,
      }
    }

    return encoded
  }
  if (value instanceof ArrayBuffer) {
    return { __studyVaultType: 'arraybuffer', data: toBase64(value) }
  }
  if (ArrayBuffer.isView(value)) {
    return {
      __studyVaultType: 'typedarray',
      name: value.constructor.name,
      data: toBase64(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)),
    }
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(encodeValue))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      await Promise.all(Object.entries(value).map(async ([key, entry]) => [key, await encodeValue(entry)])),
    )
  }

  return value
}

const decodeValue = (value) => {
  if (Array.isArray(value)) return value.map(decodeValue)
  if (!value || typeof value !== 'object') return value

  switch (value.__studyVaultType) {
    case 'undefined':
      return undefined
    case 'date':
      return new Date(value.value)
    case 'blob': {
      const blob = new Blob([fromBase64(value.data)], { type: value.type })
      return blob
    }
    case 'file': {
      const data = fromBase64(value.data)
      if (typeof File === 'undefined') return new Blob([data], { type: value.type })
      return new File([data], value.name, { type: value.type, lastModified: value.lastModified })
    }
    case 'arraybuffer':
      return fromBase64(value.data)
    case 'typedarray': {
      const data = fromBase64(value.data)
      if (value.name === 'DataView') return new DataView(data)
      const TypedArray = globalThis[value.name]
      if (typeof TypedArray !== 'function') throw new TypeError(`Unsupported typed array: ${value.name}`)
      return new TypedArray(data)
    }
    default:
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decodeValue(entry)]))
  }
}

const readRequest = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Unable to read vault data'))
})

export default class localDB {

  static async exportBackup() {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Unable to open the study vault'))
      request.onblocked = () => reject(new Error('The study vault is currently in use by another tab'))
    })

    try {
      const stores = await Promise.all(Array.from(db.objectStoreNames, async (name) => {
        const transaction = db.transaction(name, 'readonly')
        const store = transaction.objectStore(name)
        const [values, keys] = await Promise.all([
          readRequest(store.getAll()),
          readRequest(store.getAllKeys()),
        ])
        const indexes = Array.from(store.indexNames, (indexName) => {
          const index = store.index(indexName)
          return {
            name: index.name,
            keyPath: index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry,
          }
        })

        return {
          name,
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes,
          records: await Promise.all(values.map(async (value, index) => ({
            key: await encodeValue(keys[index]),
            value: await encodeValue(value),
          }))),
        }
      }))

      const settings = Object.fromEntries(APP_SETTINGS
        .filter((key) => localStorage.getItem(key) !== null)
        .map((key) => [key, localStorage.getItem(key)]))

      return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        database: { name: DATABASE_NAME, version: db.version, stores },
        settings,
      }
    } finally {
      db.close()
    }
  }

  static validateBackup(backup) {
    if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
      throw new TypeError('This is not a supported Study Vault backup')
    }
    if (
      !backup.database
      || backup.database.name !== DATABASE_NAME
      || !Array.isArray(backup.database.stores)
      || backup.database.stores.some((store) =>
        !store || typeof store.name !== 'string' || !Array.isArray(store.records) || !Array.isArray(store.indexes))
    ) {
      throw new TypeError('The backup is missing valid vault data')
    }
  }

  static async importBackup(backup, mode) {
    this.validateBackup(backup)
    if (!['replace', 'merge'].includes(mode)) {
      throw new TypeError('Choose whether to replace or merge the current vault')
    }

    const existingDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Unable to open the study vault'))
      request.onblocked = () => reject(new Error('The study vault is currently in use by another tab'))
    })

    const needsUpgrade = backup.database.stores.some((backupStore) => {
      if (!existingDb.objectStoreNames.contains(backupStore.name)) return true
      const store = existingDb.transaction(backupStore.name, 'readonly').objectStore(backupStore.name)
      return backupStore.indexes.some((index) => !store.indexNames.contains(index.name))
    })
    const targetVersion = needsUpgrade
      ? Math.max(existingDb.version, backup.database.version || 1) + 1
      : existingDb.version
    existingDb.close()

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, targetVersion)
      request.onupgradeneeded = () => {
        const upgradedDb = request.result
        for (const backupStore of backup.database.stores) {
          const store = upgradedDb.objectStoreNames.contains(backupStore.name)
            ? request.transaction.objectStore(backupStore.name)
            : upgradedDb.createObjectStore(backupStore.name, {
              keyPath: backupStore.keyPath,
              autoIncrement: backupStore.autoIncrement,
            })

          for (const index of backupStore.indexes) {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique,
                multiEntry: index.multiEntry,
              })
            }
          }
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Unable to prepare the study vault for restore'))
      request.onblocked = () => reject(new Error('Close other Study Vault tabs before restoring this backup'))
    })

    const names = Array.from(db.objectStoreNames)
    const importedByStore = Object.fromEntries(backup.database.stores.map((store) => [
      store.name,
      store.records.map((record) => ({
        key: decodeValue(record.key),
        value: decodeValue(record.value),
      })),
    ]))
    const counts = { imported: 0, skipped: 0 }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(names, 'readwrite')
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Unable to restore the study vault'))
      transaction.onabort = () => reject(transaction.error || new Error('Vault restore was aborted'))

      const addRecords = () => {
        for (const name of names) {
          const objectStore = transaction.objectStore(name)
          for (const record of importedByStore[name] || []) {
            const { value, key } = record
            const request = objectStore.keyPath === null
              ? objectStore.add(value, key)
              : objectStore.add(value)
            request.onsuccess = () => { counts.imported += 1 }
            request.onerror = (event) => {
              if (event.target.error?.name === 'ConstraintError') {
                event.preventDefault()
                event.stopPropagation()
                counts.skipped += 1
              }
            }
          }
        }
      }

      if (mode === 'replace') {
        let cleared = 0
        for (const name of names) {
          const request = transaction.objectStore(name).clear()
          request.onsuccess = () => {
            cleared += 1
            if (cleared === names.length) addRecords()
          }
        }
        if (names.length === 0) resolve()
      } else {
        addRecords()
      }
    }).finally(() => db.close())

    for (const key of APP_SETTINGS) {
      if (mode === 'replace') localStorage.removeItem(key)
      if (backup.settings?.[key] !== undefined && (mode === 'replace' || localStorage.getItem(key) === null)) {
        localStorage.setItem(key, backup.settings[key])
      }
    }

    return counts
  }

  static async getallfile() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('studyVault', 1)
       req.onsuccess = () => {
        const db = req.result
        try {
          const tx = db.transaction('files', 'readonly')
          const result = tx.objectStore('files').getAll()
          result.onsuccess = () => resolve(result.result)
          result.onerror = () => reject(result.error || new Error('Unable to read saved files'))
          tx.oncomplete = () => db.close()
          tx.onerror = () => reject(tx.error || new Error('Unable to read saved files'))
          tx.onabort = () => reject(tx.error || new Error('File lookup was aborted'))
        }
        catch (error) {
          db.close()
          reject(error)
        }
      }
      req.onerror = () => reject(req.error || new Error('Unable to open the study vault'))
    }
    )
  }

  static async getallfileInAUnit(semester, subject, unit) {
    if ([semester, subject, unit].some((value) => value == null || value === '')) {
      throw new TypeError('Semester, subject, and unit are required to load files')
    }

    return new Promise((resolve, reject) => {
      const req = indexedDB.open('studyVault', 1)

      req.onsuccess = () => {
        const db = req.result
        try {
          const tx = db.transaction('files', 'readonly')
          const result = tx.objectStore('files').getAll()
          let matchingFiles = []

          result.onsuccess = () => {
            const location = [semester, subject, unit].map(String)
            const path = location.join('/')
            matchingFiles = result.result.filter((file) => {
              const fileLocation = [file.semester, file.subject, file.unit]
              return fileLocation.every((value) => value != null)
                ? fileLocation.map(String).every((value, index) => value === location[index])
                : file.path === path
            })
          }
          result.onerror = () => reject(result.error || new Error('Unable to read saved files'))
          tx.oncomplete = () => {
            db.close()
            resolve(matchingFiles)
          }
          tx.onerror = () => reject(tx.error || new Error('Unable to read saved files'))
          tx.onabort = () => reject(tx.error || new Error('File lookup was aborted'))
        } catch (error) {
          db.close()
          reject(error)
        }
      }

      req.onerror = () => reject(req.error || new Error('Unable to open the study vault'))
    })
  }

  static async upload(file, name, semester, subject, unit,type,size,lid=null) {
    if ([semester, subject, unit].some((value) => value == null || value === '')) {
      throw new TypeError('Semester, subject, and unit are required to save a file')
    }

    return new Promise((resolve, reject) => {
      const req = indexedDB.open("studyVault", 1);

      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction("files", "readwrite");
    
          const res = tx.objectStore("files").add({
            name,
            file,
            lid:lid,
            semester: String(semester),
            subject: String(subject),
            unit: String(unit),
            type,
            size
          });
          let fileId

          res.onsuccess = () => { fileId = res.result }
          res.onerror = () => reject(res.error || new Error('Unable to save file'))
          tx.oncomplete = () => {
            db.close()
            resolve(fileId)
          }
          tx.onerror = () => reject(tx.error || new Error('Unable to save file'))
          tx.onabort = () => reject(tx.error || new Error('File upload was aborted'))
        } catch (error) {
          db.close()
          reject(error)
        }
      };

      req.onerror = () => {
        console.log(req.error)
        reject(req.error);
      };
    });
  }
}
