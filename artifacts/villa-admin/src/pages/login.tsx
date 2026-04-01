import { useState } from "react";
import { useLocation } from "wouter";
import { login } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      login(username, password);
      const res = await fetch(`https://villadata.elfar.my.id/reservations?user=${username}&pwd=${password}`);
      if (!res.ok) {
        setError("Username atau password salah.");
        localStorage.removeItem("user");
        localStorage.removeItem("pwd");
      } else {
        setLocation("/dashboard");
      }
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Villa Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola reservasi properti Anda</p>
        </div>
        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Masuk ke Akun</CardTitle>
            <CardDescription className="text-slate-400">
              Gunakan kredensial admin Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                data-testid="button-login"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium mt-2"
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Villa Booking System
        </p>
      </div>
    </div>
  );
}
