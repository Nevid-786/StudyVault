import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createEmbeddings, createChatResponse } from "../controllers/aiController.js";

const aiRouter = Router();

aiRouter.post("/embeddings", authMiddleware, createEmbeddings);
aiRouter.post("/chat", authMiddleware, createChatResponse);

export default aiRouter;
