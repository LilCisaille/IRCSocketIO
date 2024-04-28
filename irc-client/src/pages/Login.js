import Header from "../components/Header";
import LoginForm from "../components/forms/LoginForm"
import RegisterForm from "../components/forms/Register"
import "./Login.css"

function Login(){
    return(
        <div className="login">
            <Header/>
            <div className="login-content">
                <LoginForm />
                <RegisterForm />
            </div>
        </div>
    )
}

export default Login;