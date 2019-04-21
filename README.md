<p align="center"><a href="javascript:void(0);" target="_blank" rel="noreferrer"><img width="300" src="http://filecdn.code2life.top/http_adapter_logo_transparent.png" alt="Http Adapter logo"></a></p>

<p align="center">
  <a href="https://circleci.com/gh/code2life/http-adapter/tree/master"><img src="https://circleci.com/gh/Code2Life/http-adapter.svg?style=svg" alt="Build Status"></a>
  <a href="https://codecov.io/gh/code2life/http-adapter/"><img src="https://img.shields.io/codecov/c/github/code2life/http-adapter/master.svg" alt="Coverage Status"></a>
  <a href="https://www.codacy.com/app/Code2Life/http-adapter?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Code2Life/http-adapter&amp;utm_campaign=Badge_Grade"><img src="https://api.codacy.com/project/badge/Grade/e93d8415d1074997abc36c2918f079e3" alt="Codacy Badge"></a>
  <a href="https://codebeat.co/projects/github-com-code2life-http-adapter-master"><img alt="codebeat badge" src="https://codebeat.co/badges/a2025aec-3af4-484e-8b2a-a0a597f69867" /></a>
  <a href="https://www.npmjs.com/package/node-adapter"><img src="https://img.shields.io/npm/v/node-adapter.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/node-adapter"><img src="https://img.shields.io/github/license/Code2Life/http-adapter.svg" alt="License"></a>
</p>

## Introduction
A lightweight and extensible HTTP adapter, editable HTTP server, Webhook transformation, request relay platform.

Just route, filter, validate, transform, relay and response your HTTP requests.

Setup your HTTP server in 3 minutes by a few YAML configurations and a few TS/JS code snippets.
**Especially** suitable for:
- HTTP adapter, such as transform one Webhook request to another
- Request relay, it could be HTTP proxy for another server
- Mock server, it could be a mock server for development
- Dynamic HTTP interface, as BFF(backend for frontend) or API Gateway

## Demo
todo

## Features
- Dynamic request routing by configuration files, configurable and extensible runtime environment
- Easy to use YAML configuration files and GUI. Extremely convenient for request transformation
- Dynamic business logic based on dynamic Typescript/ECMAScript code and Templates
- Out of box Prometheus Metrics API and REST API for management
- Perfect Scalability with Docker and Kubernetes
- Great Performance since dynamic functions are compiled AOT (Ahead-of-Time)
- Plugin development make complex business logic being configured dynamically

## Architecture
![](http://filecdn.code2life.top/http-adapter-architecture-v2.png)

## Quick Start

### Install
```bash
# by Docker (Recommended)
docker run --restart always -p 3000:3000 -d --name http-adapter code2life/http-adapter:v1

# by Kubernetes
kubectl apply -f https://raw.githubusercontent.com/Code2Life/http-adapter/master/build/kubernetes/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/Code2Life/http-adapter/master/build/kubernetes/service.yaml

# by NPM (Requires Node > v8.0.0)
npm install -g node-adapter-cli
http-adapter

# to see all available arguments
http-adapter --help
```

### Configuration Example
```yaml
todo
```

## Plugins
todo

## Todo
- pre-installed config examples, and downloaded by cli
- HTTP2.0 HTTPS support, 
- document template grammar, and allow separate template file
- configure UI and REST interface
- mixin plugin / marketplace system, and plugin development, application version control
- routing incoming websocket message
- further logging / tracing / monitoring / metrics, eliminate console.log
- transform to more forms of outbound message, such as RPC Call, MQ Publishing
