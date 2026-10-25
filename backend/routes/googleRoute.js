import { Router } from "express";
import {
	getCurrentUser,
	getGoogleAccessToken,
} from "../controllers/googleController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const googleRouter = Router();

googleRouter.post("/code", getGoogleAccessToken);
googleRouter.get("/me", authMiddleware, getCurrentUser);

export default googleRouter;
