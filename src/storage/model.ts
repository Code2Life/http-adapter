export interface ApplicationConfig {
  name: string;
  disable: boolean;
  description: string;
  hostname?: string;
  initContext: InitContextConfig;
  routes: RouteConfig[];

  /* advanced features to do later, isolated application and ports */
  inboundType: MessageType;
  outboundType: MessageType;
  port?: number;
  additionalConf?: Object;
}

export interface RouteConfig {
  name: string;
  location: string;
  disable: boolean;
  method: CommonHttpMethod | WebSocketMethod;
  extract: ExtractionConfig;
  relay: RelayConfig[];
  response: ResponseConfig;
}

export interface ContextPlugin {
  name: string;
  disable: boolean;
  initContext: InitContextConfig;
}

export interface InitContextConfig {
  libraries: KVPair; // value as required modules
  constants: KVPair;
  initFunctions: KVPair; // value as function
  functions: KVPair; // value as function
}

export enum MessageType {
  HTTP = 'http',
  WebSocket = 'websocket'
}
export interface ExtractionConfig {
  headerHandlers: ExtractionSpec[];
  bodyHandlers: ExtractionSpec[];
}

export interface RelayConfig {
  name: string;
  outboundType: MessageType;
  location: string;
  method: CommonHttpMethod;
  headers?: KVPair;
  body?: TemplateStr;
  interceptors?: KVPair; // value as function
}

export interface ResponseConfig {
  policy: RespondPolicy;
  headers?: KVPair;
  body?: TemplateStr;
  interceptors?: KVPair; // value as function
}

/**
 * @remarks FunctionStr could be function string or file name,
 * TemplateStr could be string with ${}
 */
export type KVPair = {
  [key: string]: FunctionStr | TemplateStr | string;
};

export type ExtractionSpec = {
  key: string;
  alias?: string;
  validate?: FunctionStr;
};

export type CommonHttpMethod = 'get' | 'post' | 'put' | 'delete';

// inbound(route) = listen, outbound(relay) = emit
export type WebSocketMethod = 'listen' | 'emit';

export type RespondPolicy = 'immediate' | 'afterRelay';

export type FunctionStr = string;

export type TemplateStr = string;