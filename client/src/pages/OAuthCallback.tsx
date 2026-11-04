import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/authContext";

interface OAuthUser {
    id: string;
    name: string;
    email: string;
}

export default function OAuthCallback() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;
        try {
            const params = new URLSearchParams(window.location.hash.slice(1));
            const token = params.get("token");
            const userValue = params.get("user");
            if (!token || !userValue) throw new Error("OAuth response was incomplete");

            const user = JSON.parse(userValue) as OAuthUser;
            if (!user.id || !user.name || !user.email) throw new Error("OAuth user details were invalid");

            window.history.replaceState({}, document.title, window.location.pathname);
            login(user, token);
            navigate("/dashboard", { replace: true });
        } catch {
            toast.error("Sign-in failed. Please try again.");
            navigate("/login", { replace: true });
        }
    }, [login, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
            Completing sign-in...
        </div>
    );
}
