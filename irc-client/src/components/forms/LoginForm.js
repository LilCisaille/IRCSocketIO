import "./LoginForm.css";
import {useNavigate} from "react-router-dom";
const { useState } = require("react")


function LoginForm(){
    const [logUsername, setLogUsername] = useState('');
    const [logPassword, setLogPassword] = useState('');
    const [err, setErr] = useState('');
    const navigate = useNavigate();

    const handleLogin = () => {
        setErr('');
        fetch('http://localhost:3000/login', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: logUsername.toString(),
                    password: logPassword.toString()
                })
            }
        ).then(response => {
            if (!response.ok) {
                switch (response.status) {
                    case 400:
                        throw new Error("Wrong password.");
                    case 404:
                        throw new Error("This username doesn't exist");
                    default:
                        throw new Error("Unknown error");
                }
            }
            return response.json();
        }).then(data => {
            console.log(data);
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("username", data.username);
            navigate("/chat");
        }).catch(e => {
            setErr(e.toString().split(":")[1]);
        });
    }

    return(
        <div className="login-container">
            <h2 className="login-form-h2">Login</h2>
            <p className="login-form-p">Happy to see you back !</p>
            <form className="login-form">
                <input className="text-input" type="text" name="username" value={logUsername} placeholder="Username" onChange={e => {
                    setLogUsername(e.target.value);
                    setErr('');
                }}/>
                <input type="password" className="text-input" name="password" value={logPassword} placeholder="Password" onChange={e => {
                    setLogPassword(e.target.value);
                    setErr('');
                }}/>
                <button className="submit-btn" type="button" onClick={handleLogin}>Submit</button>
                {
                    err !== "" ? <p className="error">{err}</p> : null
                }
            </form>
        </div>
    )
}

export default LoginForm;