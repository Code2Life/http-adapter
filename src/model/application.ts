import { MessageType } from './enums';
import { RouteConfig } from './route';
import { KVPair } from './types';

export interface ApplicationConfig {
  name: string;
  disable: boolean;
  author: string;
  version: string;
  downloadURL: string;
  description: string;
  categories: string[];
  hostname?: string;
  initContext: InitContextConfig;
  routes: RouteConfig[];

  /* advanced features to do later, isolated application and ports */
  inboundType: MessageType;
  outboundType: MessageType;
  port?: number;

  /* mixin means this app depend on other apps, this is the key to impl plugins */
  mixins: MixinApplication[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MixinApplication {
  name: string;
  disable: boolean;
  routePrefix?: string;

  // when mixin mode, some constants should be overridden between apps
  overrideConf: KVPair;
}

export interface InitContextConfig {
  libraries: KVPair; // value as required modules
  constants: KVPair;
  initFunctions: KVPair; // value as function
  functions: KVPair; // value as function
}