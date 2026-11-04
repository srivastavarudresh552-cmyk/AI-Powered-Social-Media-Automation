import { randomBytes, timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import { User } from "../models/user.js";
import { generateToken } from "./authController.js";

type Provider = "google" | "github";

interface OAuthProfile {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
}

const providerIdFields: Record<Provider, "googleId" | "githubId"> = {
    google: "googleId",
    github: "githubId",
};

const getProvider = (value: string): Provider | null =>
    value === "google" || value === "github" ? value : null;

const getRequestProvider = (req: Request) =>
    typeof req.params.provider === "string" ? getProvider(req.params.provider) : null;

const getProviderCredentials = (provider: Provider) => {
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
        throw new Error(`${provider} OAuth credentials are not configured`);
    }

    return { clientId, clientSecret };
};

const getRedirectUri = (provider: Provider) => {
    const serverUrl = process.env.OAUTH_SERVER_URL;
    if (!serverUrl) {
        throw new Error("OAUTH_SERVER_URL is not configured");
    }
    return `${serverUrl.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
};

const getStateCookieName = (provider: Provider) => `user_oauth_state_${provider}`;

const cookieOptions = (maxAge: number) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/oauth",
    maxAge,
});

const readCookie = (req: Request, name: string): string | undefined => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;
    const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`OAuth provider request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
};

const exchangeCode = async (provider: Provider, code: string, redirectUri: string): Promise<string> => {
    const { clientId, clientSecret } = getProviderCredentials(provider);

    if (provider === "google") {
        const result = await fetchJson<{ access_token?: string }>("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        if (!result.access_token) throw new Error("Google did not return an access token");
        return result.access_token;
    }

    if (provider === "github") {
        const result = await fetchJson<{ access_token?: string; error?: string }>("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }),
        });
        if (!result.access_token) throw new Error(result.error || "GitHub did not return an access token");
        return result.access_token;
    }

    throw new Error("Unsupported OAuth provider");
};

const getProfile = async (provider: Provider, accessToken: string): Promise<OAuthProfile> => {
    if (provider === "google") {
        const profile = await fetchJson<{ sub?: string; email?: string; email_verified?: boolean; name?: string }>(
            "https://openidconnect.googleapis.com/v1/userinfo",
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!profile.sub || !profile.email || profile.email_verified !== true) {
            throw new Error("Google did not return a verified email address");
        }
        return { id: profile.sub, email: profile.email, name: profile.name || profile.email, emailVerified: true };
    }

    if (provider === "github") {
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "AI-Powered-Social-Media-Automation",
        };
        const [profile, emails] = await Promise.all([
            fetchJson<{ id?: number; name?: string | null; login?: string }>("https://api.github.com/user", { headers }),
            fetchJson<Array<{ email: string; primary: boolean; verified: boolean }>>("https://api.github.com/user/emails", { headers }),
        ]);
        const email = emails.find((item) => item.primary && item.verified)?.email
            || emails.find((item) => item.verified)?.email;
        if (!profile.id || !email) throw new Error("GitHub did not return a verified email address");
        return { id: String(profile.id), email, name: profile.name || profile.login || email, emailVerified: true };
    }

    throw new Error("Unsupported OAuth provider");
};

const getOrCreateOAuthUser = async (provider: Provider, profile: OAuthProfile) => {
    const providerField = providerIdFields[provider];
    const existingByProvider = await User.findOne({ [providerField]: profile.id });
    if (existingByProvider) return existingByProvider;

    const existingByEmail = await User.findOne({ email: profile.email });
    if (existingByEmail) {
        if (!profile.emailVerified) {
            throw new Error("This email is already registered; sign in using a verified provider");
        }
        existingByEmail.set(providerField, profile.id);
        await existingByEmail.save();
        return existingByEmail;
    }

    try {
        return await User.create({
            email: profile.email,
            name: profile.name,
            [providerField]: profile.id,
        });
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
            const user = await User.findOne({ [providerField]: profile.id });
            if (user) return user;
        }
        throw error;
    }
};

const getClientUrl = () => {
    const clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) throw new Error("CLIENT_URL is not configured");
    return clientUrl.replace(/\/$/, "");
};

const redirectToLoginWithError = (res: Response, error: string) => {
    const loginUrl = new URL("/login", getClientUrl());
    loginUrl.searchParams.set("oauth_error", error);
    res.redirect(loginUrl.toString());
};

export const startUserOAuth = (req: Request, res: Response): void => {
    try {
        const provider = getRequestProvider(req);
        if (!provider) {
            res.status(404).json({ message: "Unsupported OAuth provider" });
            return;
        }

        const { clientId } = getProviderCredentials(provider);
        const redirectUri = getRedirectUri(provider);
        const state = randomBytes(32).toString("hex");
        res.cookie(getStateCookieName(provider), state, cookieOptions(10 * 60 * 1000));

        const authorizationUrl = provider === "google"
            ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
            : new URL("https://github.com/login/oauth/authorize");

        authorizationUrl.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: provider === "google" ? "openid email profile" : "read:user user:email",
            state,
        }).toString();
        res.redirect(authorizationUrl.toString());
    } catch (error) {
        console.error("Could not start user OAuth:", error);
        try {
            redirectToLoginWithError(res, "This sign-in provider is not configured.");
        } catch (redirectError) {
            console.error("Could not redirect after OAuth setup failure:", redirectError);
            res.status(500).json({ message: "OAuth sign-in is not configured correctly" });
        }
    }
};

export const completeUserOAuth = async (req: Request, res: Response): Promise<void> => {
    const provider = getRequestProvider(req);
    try {
        if (!provider) {
            res.status(404).send("Unsupported OAuth provider");
            return;
        }
        if (req.query.error) throw new Error("Sign-in was cancelled or denied");

        const state = typeof req.query.state === "string" ? req.query.state : "";
        const cookieState = readCookie(req, getStateCookieName(provider));
        res.clearCookie(getStateCookieName(provider), cookieOptions(0));
        if (!state || !cookieState || state.length !== cookieState.length ||
            !timingSafeEqual(Buffer.from(state), Buffer.from(cookieState))) {
            throw new Error("OAuth state validation failed");
        }

        const code = typeof req.query.code === "string" ? req.query.code : "";
        if (!code) throw new Error("OAuth provider did not return an authorization code");

        const accessToken = await exchangeCode(provider, code, getRedirectUri(provider));
        const profile = await getProfile(provider, accessToken);
        const user = await getOrCreateOAuthUser(provider, profile);
        const token = generateToken(user._id.toString());
        const userData = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
        };
        const callbackParams = new URLSearchParams({
            token,
            user: JSON.stringify(userData),
        });
        res.redirect(`${getClientUrl()}/auth/callback#${callbackParams.toString()}`);
    } catch (error) {
        console.error(`User ${provider || "unknown"} OAuth callback failed:`, error);
        try {
            redirectToLoginWithError(res, "Sign-in failed. Please try again.");
        } catch (redirectError) {
            console.error("Could not redirect after OAuth failure:", redirectError);
            res.status(500).send("Sign-in failed. Please try again.");
        }
    }
};
