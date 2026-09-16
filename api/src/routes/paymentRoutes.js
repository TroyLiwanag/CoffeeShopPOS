import { Router } from "express";
import * as paymentController from "../controllers/paymentController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// PayMongo Webhook listener (Public endpoint for PayMongo servers)
router.post("/paymongo/webhook", paymentController.handleWebhook);

// Authenticated POS Endpoints
router.use(authenticate);
router.post("/paymongo/create-source", paymentController.createSource);
router.get("/paymongo/status/:sourceId", paymentController.getSourceStatus);

export default router;
