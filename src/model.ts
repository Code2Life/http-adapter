export interface AdaptorConfig {
  name: string;
  hostname?: string;
  location: string;
  method: CommonHttpMethod;
  initContext: InitContextConfig;
  extract: ExtractionConfig;
  relay: RelayConfig[];
  response: ResponseConfig;
}

export interface InitContextConfig {
  libraries: KVPair; // value as required modules
  constants: KVPair;
  initFunctions: KVPair; // value as function
  functions: KVPair; // value as function
}

export interface ExtractionConfig {
  headerHandlers: ExtractionSpec[];
  bodyHandlers: ExtractionSpec[];
}

export interface RelayConfig {
  name: string;
  url: string;
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

export type RespondPolicy = 'immediate' | 'afterRelay';

export type FunctionStr = string;

export type TemplateStr = string;