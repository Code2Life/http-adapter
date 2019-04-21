import { CommonHttpMethod, MessageType, RespondPolicy, WebSocketMethod } from "./enums";
import { FunctionStr, KVPair, TemplateStr } from "./types";

export interface RouteConfig {
  name: string;
  location: string;
  disable: boolean;
  method: CommonHttpMethod | WebSocketMethod;
  extract: ExtractionConfig;
  relay: RelayConfig[];
  response: ResponseConfig;
  createdAt: Date;
  updatedAt: Date;
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

export type ExtractionSpec = {
  key: string;
  alias?: string;
  validate?: FunctionStr;
};

