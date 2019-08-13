import { Observable } from 'rxjs';
import { ApplicationConfig } from '../model/application';

export enum StorageType {
  FILE_SYSTEM = 'file',
  MONGO = 'mongo'
}

export enum ConfEventType {
  Created,
  Updated,
  Deleted
}

export class ConfEvent<T> {

  public conf: T;
  public eventType: ConfEventType;

  constructor(eventType: ConfEventType, conf: T) {
    this.conf = conf;
    this.eventType = eventType;
  }
}

export abstract class ConfStorage {

  abstract initialize(): Promise<void>;

  abstract loadAllConfigurations(): Promise<ApplicationConfig[]>;

  abstract loadConfigurationByName(appName: string): Promise<ApplicationConfig>;

  abstract addOrUpdateApplicationConf(conf: ApplicationConfig): Promise<boolean>;

  abstract deleteApplicationConf(appName: string): Promise<boolean>;

  abstract watchConf(): Observable<ConfEvent<ApplicationConfig>>;

  abstract loadSeparateContent(targetFile: string, confObj: ApplicationConfig): Promise<string>;

  // from storage to zipped file
  // abstract exportConf();

  // from unzipped dir to storage
  abstract importConf(tempDir: string): Promise<void>;

  // some storage types such as db need disconnect manually, make sure no resource leak
  abstract dispose(): Promise<void>;
}