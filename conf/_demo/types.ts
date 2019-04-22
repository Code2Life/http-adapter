
export type DynamicRuntime = {
  log: (any) => any;
};

export type ResponseObj = {
  statusCode: number;
  headers: any;
  body: any;
};