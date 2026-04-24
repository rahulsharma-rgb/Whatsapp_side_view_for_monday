import express from 'express';
import { InvocableActions } from '../controllers/invocable-actions';

const router = express.Router();

// ==========================================
// 📱 META WHATSAPP ROUTES
// ==========================================
// 1. Meta Knock-Knock Verification
router.get('/whatsapp/webhook', InvocableActions.verifyWebhook);

// 2. Incoming Messages from Meta
router.post('/whatsapp/webhook', InvocableActions.handleIncomingMessage);


// ==========================================
// 💻 MONDAY UI ROUTES
// ==========================================
// 1. Send Message from React UI
router.post('/send_item_view_message', InvocableActions.sendItemViewMessage);

// 2. Load Chat History in React UI
router.get('/get_chat_history', InvocableActions.getChatHistory);

export default router;