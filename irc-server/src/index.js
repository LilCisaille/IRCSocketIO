const { app, server, io } = require('./network.js');
const bodyParser = require('body-parser');
var cors = require('cors');


const { router:userRouter } = require('./user.js');
const { router:channelRouter } = require('./channel.js'); // needed to extend socket.io
const {} = require('./message.js'); // needed to extend socket.io

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(userRouter);
app.use(channelRouter);

server.listen(3000, () => {
  console.log('listening on *:3000');
});
