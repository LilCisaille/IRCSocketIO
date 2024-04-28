import './ChatPageContent.css'
import { useEffect, useState } from "react"
import '../ChannelsList/ChannelList.css'
import socket from "../../../utils/socket"
import toast, { Toaster } from 'react-hot-toast';

function ChatPageContent() {
    const [channels, setChannels] = useState({ value: [] })
    const [searchedChannel, setSearchedChannel] = useState("")
    const [searchResult, setSearchResult] = useState({ value: [] }) // [channelName, channelName, ...
    const token = localStorage.getItem('token').toString()
    const [channel, setChannel] = useState('')
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const newMessageAsString = newMessage.toString()
    const [activeChannel, setActiveChannel] = useState('');
    const [activeChannelName, setActiveChannelName] = useState('');
    const [username, setUsername] = useState(localStorage.getItem('username').toString())
    const [usersInChannel, setUsersInChannel] = useState([])


    useEffect(() => {
        console.log(token.toString())
        fetchChannels();
        socket.emit('/INIT_CONNECTION', { token }, (data) => {
            if (data.ok) {
                console.log('Connection established')
            } else {
                console.log('Error establishing connection')
            }
            console.log(data)
        })
        socket.on('Message', (data) => {
            setMessages([...messages, data.msg])
        });
        socket.on('/newPrivateChannel', (data) => {
            console.log(data)
            fetchChannels();
        });
        listUsers();
    }, [token, messages]);

    function fetchChannels(){
        socket.emit('/list', { token, channelName: "" }, (data) => {
            if (data.ok) {
                console.log('Channels fetched')
                setChannels({ value: data.data })
            } else {
                console.log(data)
            }
        });
    }
    function checkIfCommand(msg){
        switch (true) {
            case msg.startsWith('/help'):
                console.log('help command')
                toast('Available commands : \n ' +
                    '- /nick <newNickname> \n ' +
                    '- /list <channelName> \n ' +
                    '- /create <channelName> \n ' +
                    '- /join <channelName> \n ' +
                    '- /quit <channelName> \n ' +
                    '- /msg <recipient> <message> \n ' +
                    '- /rename <channelName> <newName> \n ' +
                    '- /users \n ' +
                    '- /delete <channelName>',
                    { icon: '🔎' });
                return true;
            case msg.startsWith('/nick'):
                console.log('nick command')
                if(msg.split(' ').length < 2){
                    toast.error('No new nickname provided', { icon: '❌' });
                    return true;
                }
                socket.emit('/nick', { token, username: msg.split(' ')[1] }, (data) => {
                    if (data.ok) {
                        toast('Nickname changed', { icon: '✅' });
                        localStorage.setItem('username', msg.split(' ')[1]);
                        setUsername(msg.split(' ')[1]);
                    } else {
                        console.log(data)
                    }
                })
                return true;
            case msg.startsWith('/kick'):
                console.log('kick command')
                if(msg.split(' ').length < 2){
                    toast.error('No username provided', { icon: '❌' });
                    return true;
                }
                if(activeChannel === ''){
                    toast.error('No channel joined', { icon: '❌' });
                    return true;
                }
                kickUser(activeChannel, msg.split(' ')[1]);
                return true;
            case msg.startsWith('/list'):
                console.log('list command')
                let searchInput = "";
                if(msg.split(' ').length > 1){
                    searchInput = msg.split(' ')[1];
                }
                socket.emit('/list', { token, channelName: searchInput }, (data) => {
                    if (data.ok) {
                        if(data.data.length > 0 ){
                            toast('Channels your searched : \n - ' + data.data.map((channel) => channel.name).join('\n - '), { icon: '🔎' });
                        } else {
                            toast('No channel found', { icon: '❌' })
                        }
                    } else {
                        console.log(data)
                    }
                })
                return true;
            case msg.startsWith('/create'):
                console.log('create command')
                if(msg.split(' ').length < 2){
                    toast('No channel name provided', { icon: '👏' })
                    return true;
                }
                createChannel(msg.split(' ')[1]);
                return true;
            case msg.startsWith('/join'):
                console.log('join command')
                if(msg.split(' ').length < 2){
                    toast.error('No channel name provided', { icon: '❌' });
                    return true;
                }
                joinChannel(msg.split(' ')[1], null)
                return true;
            case msg.startsWith('/quit'):
                console.log('quit command')
                if(msg.split(' ').length < 2){
                    toast.error('No channel name provided', { icon: '❌' });
                    return true;
                }
                quitChannel(msg.split(' ')[1], null)
                return true;
            case msg.startsWith('/msg'):
                console.log('msg command');
                if(msg.split(' ').length < 3){
                    toast.error('No recipient or message provided', { icon: '❌' });
                    return true;
                }
                const recipient = msg.split(' ')[1];
                const message = msg.split(' ').slice(2).join(' ');
                socket.emit('/msg', { token, sender: recipient, message: message }, (data) => {
                    if (data.ok) {
                        toast('Message sent', { icon: '✅' });
                        socket.emit('/list', { token, channelName: "" }, (data) => {
                            if (data.ok) {
                                setChannels({ value: data.data })
                            } else {
                                console.log(data)
                            }
                        });
                    } else {
                        console.log(data)
                    }
                });
                return true;
            case msg.startsWith('/delete'):
                console.log('delete command')
                if(msg.split(' ').length < 2){
                    toast.error('No channel name provided', { icon: '❌' });
                    return true;
                }
                destroyChannel(msg.split(' ')[1]);
                return true;
            case msg.startsWith('/rename'):
                console.log('rename command')
                if(msg.split(' ').length < 3){
                    toast.error('No channel name or new name provided', { icon: '❌' });
                    return true;
                }
                renameChannel(msg.split(' ')[1], msg.split(' ')[2]);
                return true;
            case msg.startsWith('/users'):
                console.log('users command')
                listUsers();
                toast('Users in channel ' + ' : \n - ' + usersInChannel.map((user) => user.username).join('\n - '), { icon: '🧑🏼‍🤝‍🧑🏿' });
                return true;
            default:
                console.log('No command')
                return false;
        }
    }

    function listUsers(){
        if(activeChannel === ''){
            toast.error('No channel selected', { icon: '❌' });
            return null;
        }
        socket.emit('/usersChan', { token, channelID: activeChannel }, (data) => {
            if (data.ok) {
                console.log('Users fetched')
                setUsersInChannel(data.data)
            } else {
                console.log(data)
            }
        });
    }
    function sendMessage() {
        console.log('token: ' + token)
        console.log('channel: ' + activeChannel)
        console.log('message: ' + newMessageAsString)
        if(newMessageAsString === ''){
            toast.error('Message cannot be empty', { icon: '❌' });
            return null;
        }
        const isCmd = checkIfCommand(newMessageAsString);
        if(isCmd){
            console.log('Command detected')
            setNewMessage('')
            return null;
        }
        if(activeChannel === ''){
            toast.error('No channel selected. Your message can\'t be sent.', { icon: '❌' });
            setNewMessage('')
            return null;
        }
        socket.emit('message', { token, channelID: activeChannel.toString(), message: newMessageAsString }, (data) => {
            if (data.ok) {
                console.log('Message sent')
                console.log(messages)
                setNewMessage('')
            } else {
                console.log('Error sending message')
            }
        })

    }
    function createChannel(channelName) {
        const token = localStorage.getItem('token').toString()
        if(channelName === null){
            channelName = window.prompt("Enter channel name")
        }
        if (channelName === null || channelName === "") {
            toast.error('Channel name cannot be empty', { icon: '👏' });
            return
        }
        socket.emit('/create', { token, channelName }, (data) => {
            if (data.ok) {
                toast.success('Channel ' +  channelName + ' created', { icon: '✅' });
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data })
                    } else {
                        console.log(data)
                    }
                })
            } else {
                toast.error('Error creating channel', { icon: '👏' });
                console.log(data)
            }
        })
    }

    function joinChannel(channelName, channelId) {
        if(channelName !== null && channelId == null && channels.value.length > 0){
            channelId = channels.value.find((channel) => channel.name === channelName)._id;
        }
        const token = localStorage.getItem('token').toString()
        if (channels.value.find((channel) => channel.name === channelName).users.includes(localStorage.getItem('username'))) {
            alert("You are already in this channel")
            return
        }
        socket.emit('/join', { token, channelName }, (data) => {
            if (data.ok) {
                toast(`Channel ${channelName} joined`, { icon: '✅' });
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data })
                        console.log(data.data)
                    } else {
                        console.log(data)
                    }
                })
                setChannelInfos(channelId, channelName)
            } else {
                console.log(data)
                if(data.error[1] === 404){
                    toast.error('Channel not found', { icon: '❌' });
                    return null;
                }
                if(data.error[1] === 400){
                    toast.error('You are already in this channel', { icon: '❌' });
                    return null;
                }
                toast.error('Error joining channel', { icon: '❌' });
            }
        })
    }

    function quitChannel(channelName, channelId) {
        const token = localStorage.getItem('token').toString()
        if(channelId === null && channels.value.length > 0 && channelName !== null) {
            channelId = channels.value.find((channel) => channel.name === channelName)._id;
        }
        socket.emit('/quit', { token, channelName }, (data) => {
            if (data.ok) {
                toast("Channel quitted", { icon: '👏' });
                console.log(channelId.toString());
                setActiveChannel('');
                setActiveChannelName('');
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data })
                    } else {
                        console.log(data)
                    }
                })
            } else {
                alert("Error quitting channel")
                console.log(data)
            }
        })
    }

    function searchChannel() {
        const token = localStorage.getItem('token').toString()
        if (searchedChannel.toString().length < 1 || searchedChannel.toString().length === 0) {
            return
        }
        socket.emit('/list', { token, channelName: searchedChannel.toString() }, (data) => {
            if (data.ok) {
                setSearchResult({ value: data.data })
            } else {
                toast.error('Error fetching channels', { icon: '❌' });
            }
        })
    }

    function destroyChannel(channelName) {
        const token = localStorage.getItem('token').toString()
        const channelToDestroy = channels.value.find((channel) => channel.name === channelName);
        if(!channelToDestroy){
            toast.error('Channel not found', { icon: '❌' });
            return;
        }
        if(channelToDestroy.users.length > 0){
            toast('Channel can\'t be destroyed because it\'s not empty', { icon: '❌' });
            return;
        }
        socket.emit('/delete', { token, channelName }, (data) => {
            if (data.ok) {
                toast.success('Channel ' + channelName + ' destroyed', { icon: '✅' });
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data });
                    } else {
                        console.log(data)
                    }
                })
            } else {
                toast.error('Error destroying channel', { icon: '❌' });
                console.log(data)
            }
        })
    }

    function kickUser(channelId, targetUsername){
        socket.emit('/kick', { token, channelID: channelId, targetUsername }, (data) => {
            if (data.ok) {
                toast.success('User kicked', { icon: '✅' });
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data });
                    } else {
                        console.log(data)
                    }
                })
            } else {
                console.log(data)
                if(data.error[1] === 404){
                    toast.error('Channel or user not found', { icon: '❌' });
                    return null;
                }
                if(data.error[1] === 403){
                    toast.error('You are not allowed to kick user in this channel', { icon: '❌' });
                    return null;
                }
                toast.error('Error kicking user', { icon: '❌' });
            }
        });
    }

    function setChannelInfos(channelId, channelName, privateChannel) {
        setActiveChannel(channelId)
        setActiveChannelName(channelName)
        socket.emit('/get-messages', { token, channelID: channelId }, (data) => {
            if (data.ok) {
                console.log('Messages fetched')
                console.log(data.data)
                setMessages(data.data)
            } else {
                console.log('Error fetching messages')
                console.log(data)
                if(data.error[1] === 404){
                    toast.error('Channel not found', { icon: '❌' });
                }
                if(data.error[1] === 403){
                    toast.error('You are not allowed to access this channel', { icon: '❌' });
                }
            }
        })
    }

    function renameChannel(channelName, newChannelName){
        socket.emit('/rename', { token, channelName, newChannelName }, (data) => {
            if (data.ok) {
                toast.success('Channel ' + channelName + ' renamed to ' + newChannelName, { icon: '✅' });
                socket.emit('/list', { token, channelName: "" }, (data) => {
                    if (data.ok) {
                        console.log('Channels fetched')
                        setChannels({ value: data.data });
                        setActiveChannelName(newChannelName)
                    } else {
                        console.log(data)
                    }
                })
            } else {
                toast.error('Error renaming channel', { icon: '❌' });
                console.log(data)
            }
        });
    }

    return (
        <div className="chat-page-content">
            <div className="channel-list">
                <Toaster/>
                <h2>#Channels List</h2>
                <button className="create-btn" onClick={() => {
                    createChannel(null)
                }}> + Create a channel
                </button>

                <h3>🔎 Search result</h3>
                <input className="search-input" type="text"
                       placeholder="🔎 Search a channel by name"
                       value={searchedChannel}
                       onChange={(e) => setSearchedChannel(e.target.value)}
                       onKeyDown={searchChannel}
                />
                <div className="alt-tip">
                    <span className="material-symbols-outlined">
                        lightbulb
                    </span>
                    <p>
                        Search a channel with the search bar or the list command !
                    </p>
                </div>
                {
                    searchResult.value.length > 0 ?
                        // eslint-disable-next-line array-callback-return
                        searchResult.value.map((channel) => {
                            if (searchResult.value.length > 0)
                                return (
                                    <div className="channel" key={channel._id}>
                                        <p>{channel.name} : {channel.users.length} users</p>
                                        <button className="join-btn"
                                                onClick={() => joinChannel(channel.name, channel._id)}>👋 Join
                                        </button>
                                    </div>
                                )
                        }) : <p>No result</p>
                }
                <h3>🔊 All channels</h3>
                {
                    channels.value.map((channel) => {
                        if (channel.public)
                            return (
                                <div className="channel" key={"joined" + channel._id}>
                                    <p>{channel.name} : {channel.users.length} users</p>
                                    <button
                                        className="join-btn"
                                        title="Join channel"
                                        onClick={() => joinChannel(channel.name, channel._id)}>👋
                                    </button>
                                    <button
                                        title="Destroy channel"
                                        className="quit-btn"
                                        onClick={() => destroyChannel(channel.name)}>💣
                                    </button>
                                </div>
                            )
                        return null
                    })

                }
                <h3>💬 Joined channels</h3>
                {
                    channels.value.map((channel) => {
                        if (channel.users.includes(localStorage.getItem('userId')) && channel.public === true) {
                            return (
                                <div className="channel" key={channel._id}>
                                    <p className="channel-name"
                                       onClick={() => setChannelInfos(channel._id, channel.name, channel.public)}>{channel.name} : {channel.users.length} users</p>
                                    <button className="join-btn" onClick={() => {setChannelInfos(channel._id, channel.name, channel.public)}}>👁️</button>
                                    <button title="Quit channel" className="quit-btn"
                                            onClick={() => quitChannel(channel.name, channel._id)}>❌
                                    </button>
                                </div>
                            )
                        }
                        return null;
                    })
                }
            </div>
            <div className="chat">
                <div className="welcome">
                    <h2>#Chat</h2>
                    <p className="happy">Happy to see you {username} ! 😊 </p>
                    <div className='tip'>
                        <span className="material-symbols-outlined">
                            lightbulb
                        </span>
                        <p>
                            Don't like your username ? Change it simply with /rename command !
                        </p>
                    </div>
                </div>
                {
                    activeChannel === '' ? (
                        <div>
                            <p>No channel selected</p>
                            <div className="tip">
                                <span className="material-symbols-outlined">
                                    lightbulb
                                </span>
                                <p>To join a channel, click on the one you want to join in the #All Channels list
                                    or with the /join command !
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="separator"></div>
                            <p className="active-channel">📡 {activeChannelName}</p>
                            <div className="tip">
                                <span className="material-symbols-outlined">
                                lightbulb
                                </span>
                                <p>
                                    To change active channel, click on the one you want to see in the #Joined Channels
                                    list or with the /join command !
                                </p>
                            </div>
                            <div className="messages">
                                {
                                    messages.length > 0 ? (
                                        messages.map((message) => {
                                            if (message.channelData && message.channelData._id === activeChannel) {
                                                return (
                                                    <div key={message.channelData._id.toString() + message.timestamp}
                                                         className={message.msg.username === username ?
                                                             'my-msg'
                                                             : message.msg.username === 'guest_' + username ?
                                                                 'my-msg'
                                                                 : 'other-msg'}>
                                                        <p className="username-msg">{message.msg.username} :</p>
                                                        <p className="text-msg">{message.msg.text}</p>
                                                        <p className="sender-infos">{new Date(message.timestamp.toLocaleString())}</p>
                                                    </div>

                                                )
                                            } else if (message.text.startsWith('* ')) {
                                                return (
                                                    <p className="automated-msg" key={message.timestamp}>
                                                        🤖 SpearBot: {message.text}</p>
                                                )
                                            } else if (message && message.username) {
                                                return (
                                                    <div key={message.username + message.timestamp}
                                                         className={message.username === username ?
                                                             'my-msg'
                                                             : message.username === 'guest_' + username ?
                                                                 'my-msg'
                                                                 : 'other-msg'}>
                                                        <p className="username-msg"> {message.username} : </p>
                                                        <p className="text-msg">{message.text}</p>
                                                        <p className="sender-infos">{new Date(message.timestamp).toLocaleString()}</p>
                                                    </div>
                                                )
                                            } else {
                                                return (
                                                    <p></p>
                                                )
                                            }
                                        })
                                    ) : (
                                        <p>
                                            No messages in this channel yet. Be the first to make this channel alive !
                                        </p>
                                    )
                                }
                            </div>
                        </div>

                    )
                }
                <div className="new-msg">
                    <input className="message-input" type="text" value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           placeholder="💬 Type your message here..."
                           onKeyPress={(e) => {e.key === 'Enter' && sendMessage()}}
                    />
                    <button className="send-btn" onClick={sendMessage}>
                    <span className="material-symbols-outlined">
                        send
                    </span>
                        Send
                    </button>
                </div>
                <div className="alt-tip">
                    <span className="material-symbols-outlined">
                        lightbulb
                    </span>
                    <p>
                        See all available commands by typing /help !
                    </p>
                </div>
            </div>
            <div>
                <h2>#Private Messages</h2>
                {
                    channels.value.map((channel) => {
                        if (channel.public === false && channel.users.includes(localStorage.getItem('userId')) && channel.name !== localStorage.getItem('username')) {
                            return (
                                <div className="channel" key={channel._id}>
                                    <p className="channel-name"
                                       onClick={() => setChannelInfos(channel._id, channel.name)}>{channel.name.substring(0, 18) } : {channel.users.length} users</p>
                                    <button className="join-btn" onClick={() => setChannelInfos(channel._id, channel.name)}>👁️</button>
                                    <button title="Quit channel" className="quit-btn" onClick={() => quitChannel(channel.name, channel._id)}> ❌ </button>
                                </div>
                            )
                        }
                        return null;
                    })
                }
                {
                    activeChannel === '' ? (
                        <div></div>
                    ) : (
                        <div>
                            <h2>#Users in {activeChannelName.substring(0, 15)}</h2>
                            <div className="users">
                                {
                                    usersInChannel.map((user) => {
                                        return (
                                            <p key={user._id}>{user.username}</p>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    )
                }

            </div>
        </div>
    )
}

export default ChatPageContent