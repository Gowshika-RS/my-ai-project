import { useState } from "react";
import API from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email:"", password:"" });

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await API.post("/login", form);
    localStorage.setItem("token", res.data.access_token);
    window.location.href = "/dashboard";
  };

  return (
    <div className="auth">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input placeholder="Email"
          onChange={e=>setForm({...form,email:e.target.value})}/>
        <input type="password" placeholder="Password"
          onChange={e=>setForm({...form,password:e.target.value})}/>
        <button>Login</button>
      </form>
    </div>
  );
}