import jwt from "jsonwebtoken";

const JWT_ISSUER = "minor-project-api";
const AUTH_COOKIE_NAME = "authToken";

const authMiddleware = (req, res, next) => {
	const token = req.cookies?.[AUTH_COOKIE_NAME];

	if (!token) {
		return res.status(401).json({ message: "Authentication cookie is required" });
	}

	if (!process.env.JWT_SECRET) {
		console.error("JWT_SECRET is not configured");
		return res.status(500).json({ message: "Server authentication is not configured" });
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET, {
			algorithms: ["HS256"],
			issuer: JWT_ISSUER,
		});
		console.log("get user:",payload);


		req.payload=payload
	
		return next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
			return res.status(401).json({ message: "Invalid or expired authentication token" });
		}

		console.error("Authentication middleware failed:", error);
		return res.status(500).json({ message: "Unable to authenticate request" });
	}
};

export default authMiddleware;
