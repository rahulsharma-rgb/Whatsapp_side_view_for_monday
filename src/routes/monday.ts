// File: src/routes/monday.ts

import { Router } from 'express';
const router = Router();

import * as transformationController from '../controllers/monday-controller';
import authenticationMiddleware from '../middlewares/authentication';
import { InvocableActions } from '../controllers/invocable-actions'; // IMPORT NEW CLASS

// Existing boilerplate routes
router.post('/api/monday/execute_action', authenticationMiddleware, transformationController.executeAction);
router.post('/api/monday/reverse_string', authenticationMiddleware, transformationController.reverseString);

// ==========================================
// NEW PRODUCTION ROUTE
// ==========================================
// This is the Run URL you will put in the Monday Developer Center:
// https://[your-tunnel-url]/api/monday/action_send_message
router.post('/api/monday/action_send_message', authenticationMiddleware, InvocableActions.actionSendMessage);

// File: src/routes/monday.ts

// ... your existing routes ...
router.post('/api/monday/action_send_message', authenticationMiddleware, InvocableActions.actionSendMessage);

// Add this new route for the dropdown!
router.post('/api/monday/get_templates', authenticationMiddleware, InvocableActions.getTemplates);

router.post('/api/monday/get_columns', authenticationMiddleware, InvocableActions.getColumns);
export default router;