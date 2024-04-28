import {Link, useNavigate} from "react-router-dom";
import "./Header.css";
function Header(){
    const navigate = useNavigate()
    function logout(){
        localStorage.removeItem('username');
        localStorage.removeItem('token');
        sessionStorage.removeItem('selectedChannel');
        window.location.reload();
    }

    function returnHome(){
        navigate('/');
    }
    return(
        <header className="App-header">
            <img className="logo" src="/logo.svg" alt="logo" onClick={returnHome}/>
            <nav>
                <ul>
                    {
                        localStorage.getItem('username') !== null ? (
                            <div className="header-links">
                                <Link className="header-link" to="/chat">Chat</Link>
                                <p onClick={logout} className="header-link" to="/login">Logout</p>
                            </div>
                        ) : (
                            <Link className="header-link" to="/login">Login</Link>
                        )
                    }
                </ul>
            </nav>
        </header>
    )
}

export default Header;