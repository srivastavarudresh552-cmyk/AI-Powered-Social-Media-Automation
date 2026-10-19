import { createContext, createElement, useContext, useEffect, useState } from "react";
import API from "../api/axios";

interface User {
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (token) {
            API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete API.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const login = (userData: User, newToken: string) => {
        setUser(userData);
        setToken(newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    return createElement(
        AuthContext.Provider,
        {
            value: {
                user,
                token,
                isLoading,
                login,
                logout,
                isAuthenticated: !!token,
            },
        },
        children,
    );

}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// 6 : 57 : 00