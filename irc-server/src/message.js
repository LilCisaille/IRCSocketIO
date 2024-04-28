const { channels, messages, privateMessages, users, ObjectId } = require('./mongo.js')
const HttpError = require('./httpError.js')
const { io, getUserFromToken } = require('./network.js')
const { replaceBanWord } = require('./banword.js')

// Send automated message to a channel
/**
 *
 * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket - The socket object.
 * @param {*} channel
 * @param {*} user
 * @param {string} action
 * @returns
 */
async function sendAutomatedMessage(socket, channel, user, action) {
    try {
        console.debug([
            'channel: ' + channel,
            'user: ' + user,
            'action: ' + action])
        // Insert the automated message into the messages collection
        const data = await insertAutomatedMessage(channel._id.toString(), user.username, action)
        // Broadcast the automated message to all in the channel
        io.to((channel.public ? "c:" : "pc:") + channel).emit('Message', data)
        console.debug('Automated message sent successfully')
        return { ok: true, data: data }
    } catch (error) {
        // Handle errors
        throw new HttpError(error.message, { httpCode: error.httpCode || 500 })
    }
}

//automated message insertion
async function insertAutomatedMessage(channelID, username, action) {
    const msg = {
        username: username,
        text: `* ${username} ${action} the channel *`, // e.g. `* ${username} joined the channel *
        timestamp: Date.now(),
    }
    try {
        // Update the channels collection with the new message in the messages array
        const result = await channels.updateOne({
            //convert channelID to ObjectId
            _id: new ObjectId(channelID),
        }, {
            $push: {
                messages: msg,
            },
        })
        if (result.matchedCount === 0) {
            throw new HttpError('Channel not found', { httpCode: 404 })
        }
        return { channelID: channelID, msg: msg }
    } catch (error) {
        throw new HttpError(error.message, { httpCode: error.httpCode || 500 })
    }
}

// Store message into the database
async function insertMessage(channelID, user, text, public = true) {
    const msg = {
        userId: user._id,
        username: user.username,
        text: replaceBanWord(text),
        timestamp: Date.now(),
    }
    try {
        // Update the channels collection with the new message in the messages array
        const _objectId = new ObjectId(channelID)
        const result = await channels.updateOne({
            //convert channelID to ObjectId
            _id: _objectId,
            users: user._id.toString(),
        }, {
            $push: {
                messages: msg,
            },
        })
        if (result.matchedCount === 0) {
            throw new HttpError('Channel not found', { httpCode: 404 })
        }
        //use filter to return the message inserted
        const msgDataInserted = await channels.findOne(
            { _id: _objectId},
            {
                projection: {
                    _id: 1,
                    name: 1,
                    public: 1,
                    messages: {
                        $elemMatch: {
                            timestamp: msg.timestamp,
                            userId: msg.userId
                        }
                    }
                }
            })
        console.log("msgDataInserted", msgDataInserted)
        console.debug(`Message inserted with timestamp: ${msgDataInserted.timestamp}`)
        return { channelData: { _id: msgDataInserted._id.toString(), name: msgDataInserted.name, public: msgDataInserted.public }, msg: msgDataInserted.messages[0] }
    } catch (error) {
        throw new HttpError(error.message, { httpCode: error.httpCode || 500 })
    }
}

// Store private message into the database
// if no conversation exists, create one
// if conversation exists, add message to it
// return the conversation and if conversation is new
async function insertPrivateMessage(sender, recipient, text) {
    try {
        let conversation = await channels.findOne({
            users: {
                $all: [sender._id.toString(), recipient._id.toString()],
            },
            public: false,
        })
        const msg = {
            userId: sender._id,
            username: sender.username,
            text: replaceBanWord(text),
            timestamp: Date.now(),
        }
        // If no conversation exists, create one
        if (!conversation) {
            conversation = {
                name: sender._id.toString() + Date.now(),
                users: [sender._id.toString(), recipient._id.toString()],
                public: false,
                messages: [{ ...msg }],
            }
            const result = await channels.insertOne(conversation)
            console.debug(`Private message`)
            conversation._id = result.insertedId
            return { conversationData: conversation, msg: conversation.messages[0], newChannel: true }
        } else {
            // If conversation exists, add message to it
            const result = await channels.updateOne({
                _id: conversation._id,
            }, {
                $push: {
                    messages: msg,
                },
            })
            console.debug(`Private message 2`)
            conversation.messages.push(msg)
            return { conversationData: conversation, msg: conversation.messages[conversation.messages.length - 1], newChannel: false }
        }
    }
    catch (error) {
        throw new HttpError(error.message, { httpCode: error.httpCode || 500 })
    }
}

// socketio
io.on('connection', (socket) => {

    // Handle /msg command
    socket.on('/msg', async ({ token, sender, message }, callback) => {
        console.debug([
            'token: ' + token,
            'sender: ' + sender,
            'message: ' + message])
        try {
            // Find the user from the token
            const user = await getUserFromToken(token)
            // find sender from username
            const senderData = await users.findOne({ username: sender })
            if (!senderData) {
                throw new HttpError('Sender not found', { httpCode: 404 })
            }
            // Insert the private message into the privateMessages collection
            const { conversationData, msg, newChannel } = await insertPrivateMessage(user, senderData, message)
            if (!newChannel) {
                // Broadcast the private message to all in the channel
                io.to("pc:" + conversationData._id.toString()).emit('Message', { channelID: conversationData._id.toString(), msg: msg }) //! important
            } else {
                console.debug(["newChannel", "u: ", user, "u: ", senderData])
                //prevent user from new channel creation
                io.to("u:" + user._id.toString()).emit('/newPrivateChannel', conversationData) //! important
                io.to("u:" + senderData._id.toString()).emit('/newPrivateChannel', conversationData) //! important
            }
            callback({ ok: true, data: { channelID: conversationData._id.toString(), msg: msg, newChannel: newChannel } })
        } catch (error) {
            // Handle errors
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })

    // Handle regular channel messages
    socket.on('message', async ({ token, channelID, message }, callback) => {
        console.debug([
            'channelID: ' + channelID,
            'username: ' + token,
            'message: ' + message])
        try {
            // Find the user from the token
            const user = await getUserFromToken(token)
            // Insert the channel message into the messages collection
            const data = await insertMessage(channelID, user, message)
            // Broadcast the channel message to all in the channel
            if (data.channelData.public) {
                console.log(["c:" + channelID, 'Message', data])
                io.to("c:" + channelID).emit('Message', data)
            } else {
                console.log(["pc:" + channelID, 'Message', data])
                io.to("pc:" + channelID).emit('Message',data)
            }
            console.debug('Message sent successfully')
            callback({ ok: true, data: data })
        } catch (error) {
            // Handle errors
            callback({ ok: false, error: [error.message, error.httpCode] })
        }
    })
})


// Export functions
module.exports = {
    sendAutomatedMessage,
    insertMessage,
    insertPrivateMessage,
}
