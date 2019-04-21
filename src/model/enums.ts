export type CommonHttpMethod = 'get' | 'post' | 'put' | 'delete';

// inbound(route) = listen, outbound(relay) = emit
export type WebSocketMethod = 'listen' | 'emit';

export type RespondPolicy = 'immediate' | 'afterRelay';


export enum MessageType {
  // default message type
  HTTP = 'http',

  // HTTP2.0
  HTTP2 = 'http2',

  // plain websocket or secure websocket
  WebSocket = 'websocket',

  // AMQP protocol, such as ActiveMQ, RabbitMQ
  AMQP = 'amqp',

  // MQTT protocol or MQTT over websocket
  MQTT = 'mqtt',

  // gRPC protocol based on http2 and protobuf
  GRPC = 'gRPC',

  // redis pub-sub
  REDIS = 'redis'
}