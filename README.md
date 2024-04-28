
# CHAT IRC

## Description
Project is a chat IRC with the following specifications:
- The server must be able to accept multiple connections at the same times (i.e multiple users connected to the chat at the same time)
- The chat must include channels which can be joined simultaneously by the user
- The user must be able to create and delete channels
- A message must be displayed when user joins or leaves a channel
- User must be able to post on channels they joined
- Channels and messages must be persistent (i.e. stored, be it in a file or a database)
- The user must enter a nickname before joining the chat
- Client and server must communicate

In addition, the following command must be implemented:
- /nick <nickname> : change the nickname of the user
- /join <#channel> : join a channel
- /quit <#channel> : leave a channel
- /create <#channel> : create a channel
- /delete <#channel> : delete a channel
- /list <#string> : list available channels. if string is specified, list only channels that contain the string
- /rename <#channel> <#newchannel> : rename the channel name by a new one
- /msg <nickname> <message> : send a private message to a user
- <#message> : send a message to the channel
- /kick <nickname> : kick a user from a channel ( must be the creator of the channel)

## Installation
```shell
git clone git@github.com:EpitechMscProPromo2026/T-JSF-600-NCY_2.git
cd T-JSF-600-NCY_2
docker-compose up --build
npm install
```

## Requirements
- Docker
- Docker-compose
- NodeJS
- NPM
- Git

## Technologies used
- NodeJS
- Express
- Socket.io
- Docker
- Docker-compose
- MongoDB
- React
- Mongo Compass
- JSDOC

## Documentations
- [NodeJS](https://nodejs.org/en/docs/)
- [Express](https://expressjs.com/en/4x/api.html)
- [Socket.io](https://socket.io/fr/get-started/chat)
- [Docker](https://docs.docker.com/)
- [Docker-compose](https://docs.docker.com/compose/)
- [MongoDB](https://docs.mongodb.com/)
- [JSDOC](https://www.inkoop.io/blog/a-guide-to-js-docs-for-react-js/)
- [Mongo Compass](https://docs.mongodb.com/compass/current/)
- [React](https://fr.reactjs.org/docs/getting-started.html)

## Useful tutorials
- [Connect to MongoDB with Node.js](https://www.mongodb.com/docs/drivers/node/current/quick-start/connect-to-mongodb/)
- [Cheat Sheat for MongoDB](https://www.mongodb.com/docs/drivers/node/current/quick-reference/)
