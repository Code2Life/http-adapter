import path from 'path';
import { FileStorage } from './file/file-dao';
import { ConfStorage, StorageType } from './storage';

export class StorageFactory {

  public static async createBackendStorage(): Promise<ConfStorage> {
    let storage;
    if (!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === StorageType.FILE_SYSTEM) {
      // As for scalability in file mode, bind ReadWriteMany PersistentVolume in Kubernetes
      // or HostPath / VolumeMount for single node Deployment / Docker Container
      storage = new FileStorage(process.env.CONF_PATH || path.resolve(process.cwd(), 'conf'));
    }
    // only file system storage supported now, implement more storage backend later
    // prefer to Consistent storage in production, develop later
    if (storage) {
      await storage.initialize();
      return storage;
    } else {
      throw new Error('no storage type matched!' + process.env.STORAGE_TYPE);
    }
  }
}