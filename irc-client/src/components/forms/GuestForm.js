import {useRef, useState} from "react";
import './GuestForm.css';
import {Link} from "react-router-dom";


function GuestForm(){
    const [username, setUsername] = useState("");
    const usernameAsString = username.toString();
    const [err, setErr] = useState("");
    const token = useRef("");

    function removeToken() {
        if (localStorage.getItem("token") !== null)
            localStorage.removeItem("token");
    }
    function handleSubmit(e) {
        e.preventDefault();
        removeToken();
        setErr('');
        if(usernameAsString === ""){
            setErr("Username cannot be empty");
            return;
        }
        fetch("http://localhost:3000/createGuest", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameAsString
            })
        }).then(response => {
            if (!response.ok) {
                if(response.status === 400){
                    throw new Error("User already exists");
                }
                if(response.status === 403){
                    throw new Error("Incorrect token.")
                }
                console.log(response)
                throw new Error("Server error");
            }
            return response.json();
        }).then(data => {
                console.log(data);
                token.current = data.token;
                localStorage.setItem("token", token.current);
                localStorage.setItem("username", data.username);
                localStorage.setItem("userId", data.userId);
                window.location.reload();
            }
        ).catch(e => {
            setErr(e.toString().split("Error: ")[1]);
        })
    }
    return(
        <div className="guest-form-container">
            <h2 className="guest-form-h2">Almost there !</h2>
            <p className="guest-form-p">Choose a username to join the chat</p>
            <form className="guest-form">
                <input className="text-input" type="text" id="username" name="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/>
                <button type="submit" className="submit-btn" onClick={handleSubmit}>Join</button>
                {
                    err !== "" ? <p className="error">{err}</p> : null
                }
            </form>
            <p className="login-link">Already an account ? <Link to="/login">Log in !</Link></p>
        </div>
    )
}

export default GuestForm;