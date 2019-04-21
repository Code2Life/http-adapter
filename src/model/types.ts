/**
 * @remarks FunctionStr could be function string or file name,
 * TemplateStr could be string with ${}
 */
export type KVPair = {
  [key: string]: FunctionStr | TemplateStr | string;
};

export type FunctionStr = string;

export type TemplateStr = string;

export type ContextHttpResponse = {
  statusCode: number;
  headers: KVPair;
  body: any;
};