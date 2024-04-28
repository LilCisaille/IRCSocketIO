import {useEffect, useState} from "react";
import {io} from "socket.io-client";
import socket from "../../../utils/socket";

function ChatMessages() {
    const [channel, setChannel] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const newMessageAsString = newMessage.toString();
    const token = localStorage.getItem('token').toString();

    useEffect(() => {
        setChannel(sessionStorage.getItem('selectedChannel'));
        socket.emit('/INIT_CONNECTION', {token}, (data) => {
            if (data.ok) {
                console.log('Connection established');
            } else {
                console.log('Error establishing connection');
            }
            console.log(data);
        });
        socket.on('Message', (msg) => {
            setMessages([...messages, msg]);
            console.log(messages);
        });
    }, [messages, token]);

    function sendMessage(){
        console.log('token: ' + token);
        console.log('channel: ' + channel);
        console.log('message: ' + newMessageAsString);
        socket.emit('message', {token, channelID : channel, message: newMessageAsString}, (data) => {
            if(data.ok){
                console.log('Message sent');
                console.log(messages);
            }else{
                console.log('Error sending message');
            }
        });

    }

    return (
        <div>
            <h2>ChatMessages</h2>
            <p>Active channel : {channel}</p>
            {
               sessionStorage.getItem('selectedChannel') === null ? (
                     <p>No channel selected</p>
                ) : (
                     <div>

                         <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}/>
                         <button onClick={sendMessage}>Send</button>
                     </div>
                )
            }
        </div>
    );
}

export default ChatMessages;