import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Register.css"

function RegisterForm(){
    const [regUsername, setRegUsername] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [err, setErr] = useState("");
    const regUsernameAsString = regUsername.toString();
    const regPasswordAsString = regPassword.toString();

    let navigate = useNavigate();

    function removeToken() {
        if (localStorage.getItem("token") !== null)
            localStorage.removeItem("token");
    }

    function handleRegister(e){
        e.preventDefault();
        removeToken();
        if(localStorage.getItem("token") !== null){
            localStorage.removeItem("token");
        }
        setErr('');
        fetch("http://localhost:3000/createUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: regUsernameAsString,
                password: regPasswordAsString
            })
        }).then(response => {
            if (!response.ok) {
                if(response.status === 400){
                    throw new Error("User already exists");
                }
                console.log(response)
                throw new Error("Server error");
            }
            return response.json();
        }).then(data => {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
            localStorage.setItem("userId", data.userId);
            setTimeout(() => {
                navigate("/chat");
            } , 1000);
        }).catch(e => {
            setErr(e.toString().split(":")[1]);
        })
    }
    return(
        <div className="register-container">
            <h2 className="register-form-h2">Register</h2>
            <p className="register-form-p">Welcome to the chat !</p>
            <form id="register-form">
                <input className="text-input" type="text" name="username" value={regUsername} onChange={e => {
                    setRegUsername(e.target.value);
                    setErr('');
                }}/>
                <input className="text-input" type="password" name="password" value={regPassword} onChange={e => {
                    setRegPassword(e.target.value);
                    setErr('');
                }}/>
                <button className="submit-btn" type="button" onClick={handleRegister}>Submit</button>
                {
                err !== "" ? <p>{err}</p> : null
            }
            </form>
        </div>

    );
}

export default RegisterForm;