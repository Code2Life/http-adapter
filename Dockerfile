FROM circleci/node:10.15.3

WORKDIR /opt/http-adapter

RUN npm install node-adapter-cli -g

CMD [ "http-adapter" ]

EXPOSE 3000