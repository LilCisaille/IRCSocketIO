const { io, checkToken, getUserFromToken } = require('./network.js')
const { users, tokens, channels, ObjectId } = require('./mongo.js')
const { sendAutomatedMessage } = require('./message.js')

const express = require('express')
const HttpError = require('./httpError.js')
const router = express.Router()

// mongoDB indexes
channels.createIndex({ name: 1 }, { unique: true }).then((result) => {
    console.log(result)
}).catch((err) => {
    console.log(err)
})

// logique //

// rename channel
async function renameChannel(socket, user, channelName, newChannelName) {
    let channel = await channels.findOne({ name: channelName })
    if (!channel) {
        throw new HttpError("channel not found", { httpCode: 404 })
    }
    let channelExists = await channels.findOne({ name: newChannelName })
    if (channelExists) {
        throw new HttpError("channel already exists", { httpCode: 400 })
    }
    await channels.updateOne({ name: channel.name }, { $set: { name: newChannelName } })
    channel.name = newChannelName
    //notify all users in channel
    await sendAutomatedMessage(socket, channel, user, "rename")

    return channel
}

/**
 * create a channel
 * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket
 * @param {user} user
 * @param {string} name
 * @param {Array} users
 * @param {boolean} public
 * @returns {channel} channel
 */
async function createChannel(socket, user, name, users = [], public = true) {
    let channel = {
        name: name,
        users: users,
        public: public,
        creatorID: user._id.toString()
    }
    //check if channel already exists
    let channelExists = await channels.findOne({ name: channel.name, public: channel.public, users: channel.users })
    if (channelExists) {
        //if channel exists throw error
        throw new HttpError("channel already exists", { httpCode: 400 })
    }
    console.log(channel)
    const channelData = await channels.insertOne(channel)
    if (channelData.insertedCount === 0) {
        throw new HttpError("channel not created", { httpCode: 500 })
    }
    channel._id = new ObjectId(channelData.insertedId)
    console.log(channel)

    //notify all users in channel
    await sendAutomatedMessage(socket, channel, user, "create")
    return channel
}

//delete channel
async function deleteChannel(name, public = true) {
    let channel = await channels.findOne({ name: name, public: public })
    if (!channel) {
        throw new HttpError("channel not found", { httpCode: 404 })
    }
    //remove channel from database
    const deleteResult = await channels.deleteOne({ name: channel.name })
    if (deleteResult.deletedCount === 0) {
        throw new HttpError("channel not found", { httpCode: 404 })
    }
    return channel
}

//search for channel by name (case insensitive, partial matches)
async function searchChannel(user, name, public = true) {
    //get all public channels or private channels where user is in
    let channelList = await channels.find({
        $or: [
            { name: { $regex: name, $options: 'i' }, public: public },
            { name: { $regex: name, $options: 'i' }, public: false, users: user._id.toString() }
        ]
    }).toArray()
    return channelList
}

async function addUserToChannel(username, channelName, socket, public = true) {
    console.log([username, channelName, socket])

    let channel = await channels.findOne({ name: channelName, public: public })
    if (!channel) {
        throw new HttpError("channel not found", { httpCode: 404 })
    }
    let user = await users.findOne({ username: username })
    if (!user) {
        throw new HttpError("User not found", { httpCode: 404 })
    }
    //if already in channel, throw error
    if (channel.users.includes(user._id.toString())) {
        throw new HttpError("User already in channel", { httpCode: 400 })
    }
    //add user to channel
    console.debug(["join channel : ", channel.name, channel._id.toString(), user])
    channel.users.push(user._id.toString())

    await channels.updateOne({ name: channel.name }, { $set: { users: channel.users } })

    //add listener to channel
    socket.join("c:" + channel._id.toString())
    socket.emit("u:" + user._id.toString(), { ok: true, event: "join", data: { channel: channel.name, channel_id: channel._id.toString() } })

    //notify all users in channel
    await sendAutomatedMessage(socket, channel, user, "join")
}

async function removeUserFromChannel(username, channelName, socket, public = true) {
    let channel = await channels.findOne({ name: channelName })
    if (!channel) {
        throw new HttpError("channel not found", { httpCode: 404 })
    }
    let user = await users.findOne({ username: username })
    if (!user) {
        throw new HttpError("User not found", { httpCode: 404 })
    }
    //if not in channel, throw error
    if (!channel.users.includes(user._id.toString())) {
        throw new HttpError("User not in channel", { httpCode: 404 })
    }
    //remove channel from user and user from channel
    channel.users = channel.users.filter((u) => {
        return u !== user._id.toString()
    })
    await channels.updateOne({ name: channel.name }, { $set: { users: channel.users } })

    //remove listener from channel
    socket.leave("c:" + channel._id.toString())
    socket.emit("u:" + user._id.toString(), { ok: true, event: "quit", data: { channel: channel.name, channel_id: channel._id.toString() } })

    //notify all users in channel
    await sendAutomatedMessage(socket, channel, user, "quit")
}

// list channel where user is in
async function listChannels(username, public = true) {
    let user = await users.findOne({ username: username })
    if (!user) {
        throw new HttpError("User not found", { httpCode: 404 })
    }
    return await channels.find({ users: user._id.toString(), public: public }).toArray()
}

// join user rooms
async function joinUserRooms(userId, socket) {
    let userChannels = await channels.find({ users: userId.toString() },
        {
            projection: {
                name: 1,
                _id: 1,
                public: 1
            }
        }).toArray()
    console.debug(userChannels)
    //join all channels
    userChannels.forEach((channel) => {
        console.debug(channel)
        if (channel.public) {
            socket.join("c:" + channel._id.toString())
            socket.emit("u:" + userId.toString(), { ok: true, event: "listen", data: { channel: channel.name, channel_id: channel._id.toString() } })
            console.debug("join room : " + "c:" + channel._id.toString())
        } else {
            socket.join("pc:" + channel._id.toString())
            socket.emit("u:" + userId.toString(), { ok: true, event: "listen private", data: { channel: channel.name, channel_id: channel._id.toString() } })
            console.debug("join private room : " + "pc:" + channel._id.toString())
        }
    })
    //join user room
    socket.join("u:" + userId.toString())
}


//socketio
io.on('connection', (socket) => {
    socket.on('/INIT_CONNECTION', async ({ token }, callback) => {
        try {
            const user = await getUserFromToken(token)
            await joinUserRooms(user._id, socket)
            callback({ ok: true })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //create channel (no auth)
    socket.on('/create', async ({ token, channelName, addUser = false }, callback) => {
        try {
            const user = await getUserFromToken(token)
            let channel = await createChannel(socket, user, channelName, (addUser ? [user._id.toString()] : []))
            console.debug("create channel : " + channelName)
            callback({ ok: true, data: channel })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //delete channel (with auth)
    socket.on('/delete', async ({ token, channelName }, callback) => {
        try {
            const user = await getUserFromToken(token)
            await deleteChannel(channelName)
            console.debug("delete channel : " + channelName)
            callback({ ok: true })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //join channel (with auth)
    socket.on('/join', async ({ token, channelName }, callback) => {
        try {
            const user = await getUserFromToken(token)
            await addUserToChannel(user.username, channelName, socket)
            console.debug("join channel : " + channelName)
            callback({ ok: true })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //leave channel (with auth)
    socket.on('/quit', async ({ token, channelName }, callback) => {
        try {
            const user = await getUserFromToken(token)
            await removeUserFromChannel(user.username, channelName, socket)
            console.debug("quit channel : " + channelName)
            callback({ ok: true })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //search channel (with auth)
    socket.on('/list', async ({ token, channelName }, callback) => {
        try {
            const user = await getUserFromToken(token)
            let channelList = await searchChannel(user, channelName)
            console.debug("list channel : " + channelName)
            callback({ ok: true, data: channelList })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //get messages from channel (with auth)
    socket.on('/get-messages', async ({ token, channelID }, callback) => {
        try {
            const user = await getUserFromToken(token)
            let channel = await channels.findOne({ _id: new ObjectId(channelID) })
            if (!channel) {
                throw new HttpError("channel not found", { httpCode: 404 })
            }
            let messages = channel.messages || []
            console.debug("get messages from channel : " + channelID)
            callback({ ok: true, data: messages })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })

    // return users from channel (with auth)
    socket.on('/usersChan', async ({ token, channelID }, callback) => {
        try {
            console.debug(["/usersChan", token, channelID])
            const user = await getUserFromToken(token)
            let channel = await channels.findOne({ _id: new ObjectId(channelID) })
            if (!channel) {
                throw new HttpError("channel not found", { httpCode: 404 })
            }
            let usersID = channel.users.map((u) => {
                return new ObjectId(u)
            })
            console.debug(usersID)
            let u = await users.find({ _id: { $in: usersID }}, { projection: { username: 1, _id: 1 } }).toArray()
            console.debug("get users from channel : " + channelID)
            callback({ ok: true, data: u })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    // rename channel (with auth)
    socket.on('/rename', async ({ token, channelName, newChannelName }, callback) => {
        try {
            const user = await getUserFromToken(token)
            await renameChannel(socket, user, channelName, newChannelName)
            console.debug("rename of the Channel : " + channelName + " to " + newChannelName)
            callback({ ok: true })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
    //kick user from channel
    socket.on('/kick', async ({ token, channelID, targetUsername }, callback) => {
        try {
            console.debug(["/kick", token, channelID, targetUsername])
            const user = await getUserFromToken(token);
            const channel = await channels.findOne({ _id: new ObjectId(channelID) });

            // Verify that the user sending the command is the creator of the channel
            if (user._id.toString() !== channel.creatorID) {
                throw new HttpError("You are not the creator of the channel", { httpCode: 403 });
            }

            // Find the target user in the channel
            const targetUser = await users.findOne({ username: targetUsername},{
                projection: {
                    username: 1,
                    _id: 1,
                }
            });
            console.log(targetUser);
            if (targetUser === null) {
                throw new HttpError("Target user not found in the channel", { httpCode: 404 });
            }

            // Kick the target user from the channel
            await removeUserFromChannel(targetUser.username, channel.name, socket);
            console.debug(`Kicked ${targetUsername} from the channel ${channel.name}`);
            io.emit("u:" + targetUser._id.toString(), {msg: "kick", channel: channel});
            if (channel.public) {
                io.emit("c:" + targetUser._id.toString(), {msg: "kick", channel: channel, user: targetUser});
            } else {
                io.emit("pc:" + targetUser._id.toString(), {msg: "kick", channel: channel, user: targetUser});
            }
            callback({ ok: true, data: `Successfully kicked ${targetUsername} from the channel` });
        } catch (error) {
            console.log(error);
            callback({ ok: false, error: [error.message, error.httpCode] });
        }
    })
})

// router //

router.get('/list-my-channels', checkToken, async (req, res) => {
    try {
        const user = await getUserFromToken(req.headers.authorization)
        let channelList = await listChannels(user.username)
        res.json(channelList)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})

//all channel
router.get('/list-channel-search', checkToken, async (req, res) => {
    try {
        const user = await getUserFromToken(req.headers.authorization)
        let channelList = await searchChannel(req.query.name || "")
        res.json(channelList)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})


module.exports = {
    router,
}
