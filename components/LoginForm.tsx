import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LogIn, Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const LoginForm = () => {
  const {
    email,
    password,
    handleLogin,
    handleGoogleLogin,
    handleSignup,
    setEmail,
    setPassword,
    error,
    isSignUpMode,
    setIsSignUpMode,
    clearError,
  } = useAuth();

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    clearError();
  };

  return (
    <section aria-label={isSignUpMode ? "Sign Up Form" : "Login Form"}>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {isSignUpMode ? "Create Account" : "Welcome Back"}
        </h1>
        <div className="space-y-4">
          <Button className="w-full" onClick={handleGoogleLogin}>
            <LogIn className="mr-2 h-4 w-4" />
            Login with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <form
            onSubmit={
              isSignUpMode
                ? (e) => {
                    e.preventDefault();
                    handleSignup();
                  }
                : handleLogin
            }
            className="space-y-4"
          >
            <div className="relative">
              <Input
                type="email"
                id="email"
                name="email"
                autoComplete="username email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <div className="relative">
              <Input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            {error && (
              <div className="text-gray-700 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              {isSignUpMode ? "Sign Up" : "Login"}
            </Button>
          </form>
          <p className="text-center text-sm">
            {isSignUpMode ? "Already have an account?" : "New account?"}{" "}
            <Link href="#" className="underline" onClick={toggleMode}>
              {isSignUpMode ? "Login" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default LoginForm;
