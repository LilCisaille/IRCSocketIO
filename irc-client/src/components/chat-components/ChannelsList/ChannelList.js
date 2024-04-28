import {useEffect, useState} from "react";
import socket from "../../../utils/socket";
import "./ChannelList.css"

function ChannelList() {
    const [channels, setChannels] = useState({value: []});
    const [searchedChannel, setSearchedChannel] = useState("");
    const [searchResult, setSearchResult] = useState({value: []}); // [channelName, channelName, ...
    const token = localStorage.getItem('token').toString();

    useEffect(() => {
        console.log(token.toString())
        socket.emit('/list',{token, channelName:""}, (data) => {
            if(data.ok){
                console.log('Channels fetched')
                setChannels({value: data.data});
            }else{
                console.log(data)
            }
        });
    } ,[token]);


    function createChannel(){
        const token = localStorage.getItem('token').toString();
        let chanelName = window.prompt("Enter channel name");
        if(chanelName === null || chanelName === ""){
            alert("Channel name cannot be empty")
            return;
        }
        socket.emit('/create', {token, chanelName}, (data) => {
            if(data.ok){
                alert("Channel created");
            }else{
                alert("Error creating channel");
            }
        });
    }

    function joinChannel(channelName, channelId){
        const token = localStorage.getItem('token').toString();
        if(channels.value.find((channel) => channel.name === channelName).users.includes(localStorage.getItem('username'))){
            alert("You are already in this channel");
            return;
        }
        socket.emit('/join', {token, channelName}, (data) => {
            if(data.ok){
                alert("Channel joined");
                sessionStorage.setItem('selectedChannel', channelId.toString());
                socket.emit('/list',{token, channelName:""}, (data) => {
                    if(data.ok){
                        console.log('Channels fetched')
                        setChannels({value: data.data});
                        console.log(data.data)
                    }else{
                        console.log(data)
                    }
                });
            }else{
                alert("Error joining channel");
                console.log(data);
            }
        });
    }

    function quitChannel(channelName, channelId){
        const token = localStorage.getItem('token').toString();
        socket.emit('/quit', {token, channelName}, (data) => {
            if(data.ok){
                alert("Channel quitted");
                console.log(channelId.toString());
                if(sessionStorage.getItem('selectedChannel') === channelId.toString()){
                    sessionStorage.removeItem('selectedChannel');
                }
                socket.emit('/list',{token, channelName:""}, (data) => {
                    if(data.ok){
                        console.log('Channels fetched')
                        setChannels({value: data.data});
                    }else{
                        console.log(data)
                    }
                });
            }else{
                alert("Error quitting channel");
                console.log(data);
            }
        });
    }

    function searchChannel(){
        const token = localStorage.getItem('token').toString();
        if(searchedChannel.toString().length < 3 || searchedChannel.toString().length === 0){
            return;
        }
        console.log(searchedChannel.toString());
        socket.emit('/list', {token, chanelName: searchedChannel.toString()}, (data) => {
            console.log(data);
            if(data.ok){
                setSearchResult({value: data.data});
            }else{
                alert("Error fetching channels");
            }
        });
    }

    function destroyChannel(channelName){
        const token = localStorage.getItem('token').toString();
        socket.emit('/delete', {token, channelName}, (data) => {
            if(data.ok){
                alert("Channel destroyed");
                socket.emit('/list',{token, channelName:""}, (data) => {
                    if(data.ok){
                        console.log('Channels fetched')
                        setChannels({value: data.data});
                    }else{
                        console.log(data)
                    }
                });
            }else{
                alert("Error destroying channel");
                console.log(data);
            }
        });
    }

    return (
        <div className="channel-list">
            <h2>Channel List</h2>
            <button onClick={createChannel}> + Create a channel</button>
            <br/>
            <input type="text" placeholder="search a channel by name"
                   value={searchedChannel}
                   onChange={(e) => setSearchedChannel(e.target.value)}
                   onKeyDown={searchChannel}
            />
            <h3>Search result</h3>
            {
                searchResult.value.length > 0 ?
                    // eslint-disable-next-line array-callback-return
                    searchResult.value.map((channel) => {
                        if (searchResult.value.length > 0)
                            return (
                                <div className="channel" key={channel._id}>
                                    <p>{channel.name} : {channel.users.length} users</p>
                                    <button onClick={() => joinChannel(channel.name, channel._id)}>Join</button>
                                </div>
                            )
                    }) : <p>No result</p>
            }
            <h3>All channels</h3>
            {
                channels.value.map((channel) => {
                    return (
                        <div className="channel" key={"joined" + channel._id}>
                            <p>{channel.name} : {channel.users.length} users</p>
                            <button onClick={() => joinChannel(channel.name, channel._id)}>Join</button>
                            <button onClick={() => destroyChannel(channel.name)}>Destroy</button>
                        </div>
                    )
                })

            }
            <h3>Joined channels</h3>
            {
                // eslint-disable-next-line array-callback-return
                channels.value.map((channel) => {
                    if (channel.users.includes(localStorage.getItem('userId'))) {
                        return (
                            <div className="channel" key={channel._id}>
                                <p className="channel-name" onClick={() => sessionStorage.setItem('selectedChannel', channel._id.toString())}>{channel.name} : {channel.users.length} users</p>
                                <button onClick={() => quitChannel(channel.name, channel._id)}>Quit</button>
                            </div>
                        )
                    }
                })
            }
        </div>
    );
}

export default ChannelList;