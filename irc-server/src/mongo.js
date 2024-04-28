const { MongoClient, ObjectId } = require("mongodb");
const uri = "mongodb://root:example@localhost:27017/";
const client = new MongoClient(uri);

const transactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
  };



client.connect().then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.log(err);
});

const database = client.db('irc');
const users = database.collection('users');
const tokens = database.collection('tokens');
const channels = database.collection('channels');
const messages = database.collection('messages');
const privateMessages = database.collection('privateMessages');

module.exports = {
    client,
    database,
    users,
    tokens,
    channels,
    messages,
    privateMessages,
    transactionOptions,
    ObjectId
};