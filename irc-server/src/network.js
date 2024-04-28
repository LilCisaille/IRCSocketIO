const { tokens, users, ObjectId } = require('./mongo.js');

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: '*',
        allowedHeaders: '*'
    }
});

//get token from header and check if it is valid as middleware for express
//actually useless
async function checkToken(req, res, next) {
    let token = req.headers.authorization
    if (!token) {
        res.status(401).json({ "error": "no token" })
        return
    }
    //check if token is valid with mongo
    let tokenData = await tokens.findOne({ token: token })
    if (!tokenData) {
        res.status(401).json({ "error": "invalid token" })
        return
    }
    next()
}


//get user from token as middleware for socketio
async function getUserFromToken(token) {
    console.log("token : " + token)
    let tokenData = await tokens.findOne({ token: token })
    console.log("tokenData : ")
    console.log(tokenData)
    if (!tokenData) {
        throw new Error("invalid token")
    }
    return await users.findOne({ _id: new ObjectId(tokenData.userId) })
}

module.exports = {
    app,
    server,
    io,
    checkToken,
    getUserFromToken
};