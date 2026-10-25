import jwt from "jsonwebtoken";
import getOrCreateFolder from "../config/gdrivefolderCreate.js"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const JWT_ISSUER = "minor-project-api";
const AUTH_COOKIE_NAME = "authToken";
const JWT_MAX_AGE_MS = 60 * 60 * 1000;

export const getGoogleAccessToken = async (req, res) => {
	const { code } = req.body;
    console.log("Received authorization code:", code);

	if (typeof code !== "string" || !code.trim()) {
		return res.status(400).json({ message: "Authorization code is required" });
	}

	const requiredConfig = [
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"GOOGLE_REDIRECT_URI",
		"JWT_SECRET",
	];
	const missingConfig = requiredConfig.filter((key) => !process.env[key]);
	if (missingConfig.length > 0) {
		console.error(`Missing required environment variables: ${missingConfig.join(", ")}`);
		return res.status(500).json({ message: "Server authentication is not configured" });
	}

	try {
		const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: process.env.GOOGLE_CLIENT_ID,
				client_secret: process.env.GOOGLE_CLIENT_SECRET,
				redirect_uri: process.env.GOOGLE_REDIRECT_URI,
				grant_type: "authorization_code",
			}),
		});
		const googleTokens = await tokenResponse.json();
        console.log("Received Google tokens:", googleTokens);

		if (!tokenResponse.ok || !googleTokens.access_token) {
			return res.status(400).json({ message: "Google token exchange failed" });
		}

		const profileResponse = await fetch(GOOGLE_USER_INFO_URL, {
			headers: { Authorization: `Bearer ${googleTokens.access_token}` },
		});
		const profile = await profileResponse.json();

		if (!profileResponse.ok || !profile.id || !profile.email) {
			return res.status(401).json({ message: "Unable to verify Google account" });
		}

		const folderId = await getOrCreateFolder(googleTokens.access_token)

		const user = {
			id: String(profile.id),
			email: profile.email,
			name: profile.name ?? "",
			picture: profile.picture ?? null,
		};

		const token = jwt.sign(
			{
				user:{sub: user.id,
				email: user.email,
				name: user.name,
				picture: user.picture,},
				googleAccessToken: googleTokens.access_token,
				folderId: folderId
			},
			process.env.JWT_SECRET,
			{ algorithm: "HS256", expiresIn: "1h", issuer: JWT_ISSUER }
		);

		res.cookie(AUTH_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "none",
			maxAge: JWT_MAX_AGE_MS,
			path: "/",
		}).cookie("google_access_token",  googleTokens.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "none",
			maxAge: JWT_MAX_AGE_MS,
			path: "/",
		});

		return res.json({user:{sub: user.id,
				email: user.email,
				name: user.name,
				picture: user.picture,},
				googleAccessToken: googleTokens.access_token,
				folderId: folderId});
	} catch (error) {
		console.error("Google authorization failed:", error);
		return res.status(500).json({ message: "Unable to complete Google sign-in" });
	}
};

export const getCurrentUser = (req, res) => {
	
	return res.json(req.payload);
};
