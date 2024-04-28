import GuestForm from "../components/forms/GuestForm";
import Header from "../components/Header";
import ChatPageContent from "../components/chat-components/ChatPageContent/ChatPageContent";

function ChatPage(){

    return (
        <div className="chat-page">
            <Header/>
            {
                localStorage.hasOwnProperty('username') ? (
                    <ChatPageContent />
                ) : (
                    <GuestForm />
                )
            }
        </div>
    )
}

export default ChatPage;