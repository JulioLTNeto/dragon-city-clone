"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetMessage("");

    if (!email) {
      setError("Por favor, digite seu e-mail no campo acima.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setResetMessage(data.message);
        setTimeout(() => setIsResetting(false), 5000); // Voltar para login depois de 5s
      } else {
        setError(data.message || "Erro ao resetar senha");
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

        {resetMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 font-bold text-center">
            {resetMessage}
          </div>
        )}

        {!isResetting ? (
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold uppercase">Senha</label>
                <button 
                  type="button" 
                  onClick={() => { setIsResetting(true); setError(""); setResetMessage(""); }}
                  className="text-xs font-bold text-[#e74c3c] hover:text-[#c0392b]"
                >
                  Esqueceu a senha?
                </button>
              </div>
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
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <p className="text-sm text-gray-600 text-center font-bold">
              Digite seu e-mail para gerar uma nova senha provisória.
            </p>
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

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => { setIsResetting(false); setError(""); setResetMessage(""); }}
                className="w-1/3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-2 rounded-lg border-b-4 border-gray-700 active:border-b-0 active:translate-y-1 transition-all uppercase text-sm"
              >
                Voltar
              </button>
              <button 
                type="submit" 
                className="w-2/3 bg-[#e74c3c] hover:bg-[#c0392b] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-[#922b21] active:border-b-0 active:translate-y-1 transition-all uppercase text-sm"
              >
                Recuperar
              </button>
            </div>
          </form>
        )}

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
