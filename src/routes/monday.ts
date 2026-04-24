// File: src/routes/monday.ts

import { Router } from 'express';
const router = Router();

import * as transformationController from '../controllers/monday-controller';
import { authenticationMiddleware } from '../middlewares/authentication';
import { InvocableActions } from '../controllers/invocable-actions'; 
import { DuplicateRules } from '../controllers/duplicate-rules';
import { AutoNumberHandler } from "../controllers/auto-number-handler";
import { DateTimeHandler } from "../controllers/date-time-handler";
import { LinkedItemHandler } from "../controllers/linked-item-handler";

router.post('/api/monday/execute_action', authenticationMiddleware, transformationController.executeAction);
router.post('/api/monday/reverse_string', authenticationMiddleware, transformationController.reverseString);

router.post('/api/monday/action_send_message', authenticationMiddleware, InvocableActions.actionSendMessage);
router.post('/api/monday/get_templates', authenticationMiddleware, InvocableActions.getTemplates);
router.post('/api/monday/get_columns', authenticationMiddleware, InvocableActions.getColumns);
router.post("/api/monday/check-duplicates", authenticationMiddleware, DuplicateRules.actionCheckDuplicateWithLogger);
router.post("/api/monday/calculate-auto-number", authenticationMiddleware, AutoNumberHandler.handleCustomAutoNumberCalculation);
router.post("/api/monday/set-date-to-now", authenticationMiddleware, DateTimeHandler.handleSetDateTimeColumnAsNow);
router.post('/api/monday/send_bank_details', InvocableActions.sendBankDetails);
router.post("/api/monday/fetch-linked-column", authenticationMiddleware, LinkedItemHandler.actionFetchAndPopulate);

// Item View (Side Panel) Routes
router.get('/api/monday/get_chat_history', authenticationMiddleware, InvocableActions.getChatHistory);
router.post('/api/monday/send_item_view_message', authenticationMiddleware, InvocableActions.sendItemViewMessage);

// ==========================================
// META WEBHOOK ROUTES (INBOUND MESSAGES)
// ==========================================
// No authenticationMiddleware here because Meta does not have a Monday token
router.get('/api/whatsapp/webhook', InvocableActions.verifyWebhook);
router.post('/api/whatsapp/webhook', InvocableActions.handleIncomingMessage);

export default router;