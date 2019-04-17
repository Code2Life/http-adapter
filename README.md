<p align="center"><a href="javascript:void(0);" target="_blank" rel="noopener noreferrer"><img width="300" src="http://filecdn.code2life.top/http_adapter_logo_transparent.png" alt="Http Adapter logo"></a></p>

<p align="center">
  <a href="https://circleci.com/gh/code2life/http-adapter/tree/master"><img src="https://circleci.com/gh/Code2Life/http-adapter.svg?style=svg" alt="Build Status"></a>
  <a href="https://codecov.io/gh/code2life/http-adapter/"><img src="https://img.shields.io/codecov/c/github/code2life/http-adapter/master.svg" alt="Coverage Status"></a>
  <a href="https://npmcharts.com/compare/node-adapter?minimal=true"><img src="https://img.shields.io/npm/dm/node-adapter.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/node-adapter"><img src="https://img.shields.io/npm/v/node-adapter.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/node-adapter"><img src="https://img.shields.io/github/license/Code2Life/http-adapter.svg" alt="License"></a>
</p>

## Introduction
A lightweight and extensible HTTP adapter, editable HTTP server, Webhook transformation, request relay platform.

Just route, filter, validate, transform, relay and response your HTTP requests.

Setup your HTTP server in 3 minutes by a few YAML configurations and a few TS/JS code snippets.
**Especially** suitable for:
- HTTP adapter, such as transform webhook request to another
- request relay, it could be HTTP proxy for another server
- mock server, it could be a mock server if no relay configurations set
- dynamic HTTP interface, as BFF(backend for frontend) or API Gateway

## Demo
todo

## Architecture
![](http://filecdn.code2life.top/http-adapter-architecture-v2.png)

## Quick Start

### Install
temporary unavailable, developing
```bash
# by NPM (Requires Node > v10.0.0)
npm install -g node-adapter-cli
http-adapter -p 3001

# by Docker
docker run --restart always -p 3000:3000 -d --name http-adapter code2life/http-adapter

# by Kubernetes
deployment-content-link
```

## Configuration Example
```yaml
todo
```

## Plugins
todo

## Features
- Dynamic request routing by configuration files
- Typescript/ECMAScript code supported
- TODO

## Todo
- document template grammar, and allow separate template file
- configure UI and REST interface
- install and use as cli with parameters
- separate RuntimeContext with AdapterConfig (1 -> N)
- documents and TS/JS/YAML configuration templates
- plugin system, and plugin development
- routing incoming websocket message
- logging / tracing / monitoring / metrics
- transform to more form of outbound message, such as RPC Call, MQ Message
