import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import googleRouter from "./routes/googleRoute.js";

const app = express();
app.use(cors({
	origin: process.env.FRONTEND_URL || "http://localhost:5173",
	credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/google", googleRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
