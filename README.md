## http-adaptor
A extensible HTTP adapter and request relay platform. 

Just route, filter, validate, transform, relay and response your HTTP requests.

Setup your HTTP server in 3 minutes by a few YAML configurations and a few TS/JS code snippets.
**Especially** suitable for:
- HTTP adaptor, such as transform webhook request to another
- request relay, it could be HTTP proxy for another server
- mock server, it could be a mock server if no relay configurations set
- develop dynamic HTTP interface, BFF(backend for frontend)

## Demo
todo

## Quick Start

### Install
temporary unavailable, developing
```bash
# by NPM
npm install -g http-adaptor
http-adaptor -p 3001

# by Docker
docker run --restart always -p 3000:3000 -d --name http-adaptor code2life/http-adaptor

# by Kubernetes
deployment-content-link
```

## Configure
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
- documents and TS/JS/YAML configuration templates
- plugin system, and plugin development
- routing incoming websocket message
- logging / tracing / monitoring / metrics

## License
Apache-2.0