import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import googleRouter from "./routes/googleRoute.js";
import aiRouter from "./routes/aiRoute.js";

const app = express();
app.use(cors({
	origin: process.env.FRONTEND_URL || "http://localhost:5173",
	credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/google", googleRouter);
app.use("/api/ai", aiRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
