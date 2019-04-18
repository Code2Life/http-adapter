import { Observable } from 'rxjs';
import { ApplicationConfig, ContextPlugin } from './model';

export enum StorageType {
  FILE_SYSTEM = 'file',
  MONGO = 'mongo',
  ETCD = 'etcd',
  CONSUL= 'consul'
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

  abstract listAllPlugins(): Promise<ContextPlugin[]>;

  abstract listAllApplications(): Promise<ApplicationConfig[]>;

  abstract findApplicationByName(appName: string): Promise<ApplicationConfig>;

  abstract findPluginByName(): Promise<ContextPlugin>;

  abstract addOrUpdateApplicationConf(conf: ApplicationConfig): Promise<boolean>;

  abstract addOrUpdatePluginConf(conf: ContextPlugin): Promise<boolean>;

  abstract deleteApplicationConf(conf: ApplicationConfig): Promise<boolean>;

  abstract deletePluginConf(conf: ApplicationConfig): Promise<boolean>;

  abstract watchApplicationConf(): Observable<ConfEvent<ApplicationConfig>>;

  abstract watchPluginConf(): Observable<ConfEvent<ContextPlugin>>;

  abstract loadSeparateFunction(targetFile: string, confObj: ApplicationConfig): Promise<string>;

  // abstract exportApplicationConf();

  // abstract importApplicationConf();
}