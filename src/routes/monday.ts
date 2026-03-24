// File: src/routes/monday.ts

import { Router } from 'express';
const router = Router();

import * as transformationController from '../controllers/monday-controller';
import authenticationMiddleware from '../middlewares/authentication';
import { InvocableActions } from '../controllers/invocable-actions'; // IMPORT NEW CLASS
import { DuplicateRules } from '../controllers/duplicate-rules';
import { AutoNumberHandler } from "../controllers/auto-number-handler";
import { DateTimeHandler } from "../controllers/date-time-handler";
// 1. Existing boilerplate routes
router.post('/api/monday/execute_action', authenticationMiddleware, transformationController.executeAction);
router.post('/api/monday/reverse_string', authenticationMiddleware, transformationController.reverseString);

// ==========================================
// NEW PRODUCTION ROUTE
// ==========================================
// This is the Run URL you will put in the Monday Developer Center:
// https://[your-tunnel-url]/api/monday/action_send_message

// File: src/routes/monday.ts

// 2. WhatsApp Messages
router.post('/api/monday/action_send_message', authenticationMiddleware, InvocableActions.actionSendMessage);

router.post('/api/monday/action_send_message', authenticationMiddleware, InvocableActions.actionSendMessage);

// Add this new route for the dropdown!
router.post('/api/monday/get_templates', authenticationMiddleware, InvocableActions.getTemplates);

router.post('/api/monday/get_columns', authenticationMiddleware, InvocableActions.getColumns);

//3. Checking Duplicates
router.post("/api/monday/check-duplicates", authenticationMiddleware, DuplicateRules.actionCheckDuplicateWithLogger);

//4. Increase Custom Auto Number (Text or Numeric) fields after creation.
router.post("/api/monday/calculate-auto-number", authenticationMiddleware, AutoNumberHandler.handleCustomAutoNumberCalculation);

router.post("/api/monday/set-date-to-now", authenticationMiddleware, DateTimeHandler.handleSetDateTimeColumnAsNow);


export default router;