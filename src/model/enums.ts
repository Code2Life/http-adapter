export type CommonHttpMethod = 'get' | 'post' | 'put' | 'delete';

// inbound(route) = listen, outbound(relay) = emit
export type WebSocketMethod = 'listen' | 'emit';

export type RespondPolicy = 'immediate' | 'afterRelay';


export enum MessageType {
  HTTP = 'http',
  WebSocket = 'websocket'
}