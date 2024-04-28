import './App.css';
import {Link} from "react-router-dom";
import Header from "./components/Header";
import {useNavigate} from "react-router-dom";
import {useEffect} from "react";

function App() {
    const navigate = useNavigate();
    useEffect(() => {
        if(localStorage.getItem('token')){
            navigate('/chat');
        }
    }, [navigate]);
    return (
        <div className="App">
            <Header />
            <div className="home-content">
                <img className="home-img" src="/pear_img.png" alt="pear_image"/>
                <div className="text-content">
                    <h1>The healthiest chat.</h1>
                    <p className={"subtitle"}>Join spear now and meet awesome people, no registration needed.</p>
                    <Link className="btn main-btn" to="/chat">Join as guest</Link>
                    <Link className="btn secondary-btn" to="/login">Create an account</Link>
                </div>
            </div>
        </div>
    );
}

export default App;
