"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setError(data.message || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro de conexão com o servidor");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#5bb3ff]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-4 border-[#3a8ec4]">
        <h1 className="text-3xl font-bold text-center text-[#2c3e50] mb-8 uppercase tracking-wider">
          Dragon City
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2 uppercase">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#5bb3ff]"
              required 
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2 uppercase">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#5bb3ff]"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#f1c40f] hover:bg-[#f39c12] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-[#d35400] active:border-b-0 active:translate-y-1 transition-all uppercase text-lg"
          >
            Entrar na Ilha
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Ainda não tem uma ilha?{" "}
          <Link href="/register" className="text-[#3498db] hover:text-[#2980b9] font-bold">
            Criar Conta
          </Link>
        </p>
      </div>
    </div>
  );
}
