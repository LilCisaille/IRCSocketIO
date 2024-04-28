const { users, tokens, channels, messages, client, transactionOptions } = require('./mongo.js')
const { io } = require('./network.js')

const express = require('express')
const router = express.Router()
const HttpError = require('./httpError.js')

const bcrypt = require('bcrypt')


// logique //

users.createIndex({ username: 1 }, { unique: true }).then((result) => {
    console.log(result)
}).catch((err) => {
    console.log(err)
})

//generate unique token
async function generateToken() {
    let token = Math.random().toString(36).substring(2, 15)
    //check if token already exists
    let tokenExists = await tokens.findOne({ token: token })
    if (tokenExists) {
        //if token exists, generate another one
        return generateToken()
    } else {
        //if token doesn't exist, return it
        return token
    }
}


// create a guest user with username guest_<random number or username>
// store the guest user in the database
async function createGuest(username) {
    let token = await generateToken()
    let user = {
        username: "guest_" + username,
        password: null
    }
    //check if username already exists
    let userExists = await users.findOne({ username: user.username })

    if (userExists) {
        //if username exists throw error
        throw new HttpError("Username already exists", { httpCode: 400 })
    }
    //if username doesn't exist, create user and token
    const userData = await users.insertOne(user)
    const tokenData = await tokens.insertOne({
        username: user.username,
        userId: userData.insertedId,
        token: token
    })
    return {
        username: user.username,
        token: token,
        userId: userData.insertedId,
        _id: tokenData.insertedId
    }
}

// create a user with username and password
// store the user in the database
async function createUser(username, password) {
    let token = await generateToken()
    const saltRounds = 10 // This is the cost factor for the hashing function.
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    let user = {
        username: username,
        password: hashedPassword,
        channels: []
    }
    //check if username already exists
    let userExists = await users.findOne({ username: user.username })

    if (userExists) {
        //if username exists throw error
        throw new HttpError("Username already exists", { httpCode: 400 })
    }
    //if username doesn't exist, create user and token
    const userData = await users.insertOne(user)
    const tokenData = await tokens.insertOne({
        username: user.username,
        userId: userData.insertedId,
        token: token
    })
    return {
        username: user.username,
        token: token,
        userId: userData.insertedId,
        _id: tokenData.insertedId
    }
}

async function login(username, password) {
    const user = await users.findOne({ username: username })

    if (user) {
        const passwordMatch = await bcrypt.compare(password, user.password)

        if (passwordMatch) {
            // Passwords match, proceed with login.
            const token = await generateToken()
            const tokenData = await tokens.insertOne({
                username: user.username,
                userId: user._id.toString(),
                token: token,
            })

            return {
                username: user.username,
                token: token,
                userId: user._id.toString(),
                _id: tokenData.insertedId,
            }
        } else {
            // Wrong password.
            throw new HttpError('Wrong password', { httpCode: 400 })
        }
    } else {
        // User not found.
        throw new HttpError("User doesn't exist", { httpCode: 404 })
    }
}

// change the username of a guest user to username and set the password
async function guestToUser(token, username, password) {
    let user = await users.findOne({ username: username })
    if (user) {
        throw new HttpError("Username already exists", { httpCode: 400 })
    } else {
        //find user by token
        let tokenExists = await tokens.findOne({ token: token })
        if (tokenExists) {
            //if token exists, update user and token
            const saltRounds = 10 // This is the cost factor for the hashing function.
            const hashedPassword = await bcrypt.hash(password, saltRounds)
            await users.updateOne({ username: tokenExists.username }, { $set: { username: username, password: hashedPassword } })
            await tokens.updateOne({ token: token }, { $set: { username: username } })
            return token
        } else {
            throw new HttpError("you have no power here (no guest with this token)", { httpCode: 403 })
        }
    }
}

async function rename(username, token) {
    //find user by token
    let tokenExists = await tokens.findOne({ token: token })
    if (!tokenExists) {
        throw new Error("you have no power here (no user with this token)", { httpCode: 403 })
    }
    //get user by token
    let user = await users.findOne({ username: tokenExists.username })
    if (!user) {
        throw new Error("User not found", { httpCode: 404 })
    }
    //check if guest
    if (user.username.startsWith("guest_")) {
        username = "guest_" + username
    }
    //check if username already exists
    let userExists = await users.findOne({ username: username })
    if (userExists) {
        //if username exists throw error
        throw new Error("Username already exists", { httpCode: 400 })
    }
    //if username doesn't exist, update user and tokens
    await users.updateOne({ username: user.username }, { $set: { username: username } })
    await tokens.updateMany({ username: user.username }, { $set: { username: username } })
    return { username, token }
}


//socketio
io.on('connection', (socket) => {
    socket.on("/nick", async ({ username, token }, callback) => {
        console.log([username, token])
        try {
            let result = await rename(username, token)
            callback({ ok: true, data: { token: result.username } })
        } catch (error) {
            console.log(error)
            callback({ ok: false, error: [error.message, error.httpCode] })

        }
    })
})


// router //
router.post('/createGuest', async (req, res) => {
    try {
        let data = await createGuest(req.body.username)
        res.json(data)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})

router.post('/createUser', async (req, res) => {
    try {
        let data = await createUser(req.body.username, req.body.password)
        res.json(data)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})

router.post('/login', async (req, res) => {
    try {
        let data = await login(req.body.username, req.body.password)
        res.json(data)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})

router.post('/guestToUser', async (req, res) => {
    try {
        let data = await guestToUser(req.body.token, req.body.username, req.body.password)
        res.json(data)
    } catch (error) {
        let httpCode = error.httpCode || 500
        res.status(httpCode).json(error.message)
    }
})

module.exports = {
    router,
}
