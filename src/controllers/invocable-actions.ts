import { Request, Response } from 'express';
import MondayService from '../services/monday-service';
import { WhatsappService } from '../services/whatsapp-service';

export class InvocableActions {
    
    static async sendItemViewMessage(req: Request, res: Response) {
        console.log("\n[BACKEND - InvocableActions] 📥 Received request to SEND a message from UI.");
        
        const shortLivedToken = (req as any).session?.shortLivedToken;
        const { phone, message } = req.body; 
        const archiveBoardId = process.env.CHAT_ARCHIVE_BOARD_ID || "5027801430"; 
        const token = shortLivedToken || process.env.MONDAY_TOKEN;

        if (!token || !phone || !message) {
            console.error("[BACKEND - InvocableActions] ❌ Missing required fields (token, phone, or message).");
            return res.status(400).send({ message: 'Missing required fields' });
        }

        try {
            console.log(`[BACKEND - InvocableActions] 🚀 Passing message to WhatsappService for phone: ${phone}`);
            const cleanPhone = phone.replace(/[^0-9]/g, '');

            const result = await WhatsappService.sendDirectText(cleanPhone, message);

            if (archiveBoardId) {
                console.log(`[BACKEND - InvocableActions] 📝 Logging OUTGOING message to Archive Board ID: ${archiveBoardId}`);
                const isSuccess = !!result.messages;
                const logText = isSuccess ? message : `❌ META REJECTED: ${message} (Reason: ${result.error?.message || 'Unknown'})`;
                const wamid = isSuccess ? result.messages[0].id : "Failed";

                await MondayService.createChatLog(token, archiveBoardId, {
                    phone: cleanPhone,  
                    text: logText,
                    sender: 'agent',
                    wamid: wamid
                });
            }

            if (result.messages) {
                console.log("[BACKEND - InvocableActions] ✅ Outgoing process completed successfully.");
                return res.status(200).send({ success: true, wamid: result.messages[0].id });
            } else {
                console.warn("[BACKEND - InvocableActions] ⚠️ Message blocked by Meta, but error was logged.");
                return res.status(400).send({ success: false, message: result.error?.message });
            }
        } catch (err: any) {
            console.error("[BACKEND - InvocableActions] ❌ Catch Error in sendItemViewMessage:", err);
            return res.status(500).send({ message: err.message });
        }
    }

    static async handleIncomingMessage(req: Request, res: Response) {
        console.log("\n[BACKEND - InvocableActions] 🚨 INCOMING WEBHOOK TRIGGERED BY META!");
        try {
            const body = req.body;
            if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

            const entry = body.entry?.[0]?.changes?.[0]?.value;
            const message = entry?.messages?.[0];

            if (message && message.type === 'text') {
                const customerPhone = message.from; 
                const text = message.text.body;
                const messageId = message.id; 

                console.log(`[BACKEND - InvocableActions] 📨 Message Details - From: ${customerPhone} | Text: ${text}`);
                
                const archiveBoardId = process.env.CHAT_ARCHIVE_BOARD_ID || "5027801430";
                const systemToken = process.env.MONDAY_TOKEN || process.env.MONDAY_API_TOKEN; 

                if (systemToken && archiveBoardId) {
                    console.log(`[BACKEND - InvocableActions] 📝 Passing INCOMING message to MondayService...`);
                    await MondayService.createChatLog(systemToken, archiveBoardId, {
                        phone: customerPhone, 
                        text: text,
                        sender: 'customer',
                        wamid: messageId 
                    });
                    console.log(`[BACKEND - InvocableActions] ✅ Incoming message logged successfully!`);
                } else {
                    console.error(`[BACKEND - InvocableActions] ❌ Missing MONDAY_TOKEN! Cannot log to database.`);
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error("[BACKEND - InvocableActions] ❌ Error in handleIncomingMessage:", err);
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    static verifyWebhook(req: Request, res: Response) {
        console.log("\n[BACKEND - InvocableActions] 🚪 Meta is knocking at the door...");
        
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'mondaytest';
        
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log("[BACKEND - InvocableActions] ✅ Meta Webhook Verified Successfully!");
                return res.status(200).send(challenge); 
            } else {
                console.error("[BACKEND - InvocableActions] ❌ Webhook verification failed. Tokens don't match.");
                return res.sendStatus(403);
            }
        }
        
        return res.status(400).send("Bad Request");
    }

    // ==========================================
    // 📜 FETCH CHAT HISTORY FOR UI (GET)
    // ==========================================
    static async getChatHistory(req: Request, res: Response) {
        console.log("\n[BACKEND - InvocableActions] 🔄 React UI is requesting chat history...");
        
        const shortLivedToken = (req as any).session?.shortLivedToken;
        const token = shortLivedToken || process.env.MONDAY_TOKEN;
        const { phone } = req.query;
        const archiveBoardId = process.env.CHAT_ARCHIVE_BOARD_ID || "5027801430";

        if (!phone || !token) {
            return res.status(400).send({ message: "Missing phone number or authentication token" });
        }

        try {
            // Remove + or spaces from phone just in case
            const cleanPhone = (phone as string).replace(/[^0-9]/g, '');
            const logs = await MondayService.getChatLogsByPhone(token, archiveBoardId, cleanPhone);
            
            console.log(`[BACKEND - InvocableActions] ✅ Sending ${logs.length} messages to UI.`);
            return res.status(200).send({ success: true, data: logs });
        } catch (err: any) {
            console.error("[BACKEND - InvocableActions] ❌ Error fetching chat history:", err);
            return res.status(500).send({ message: err.message });
        }
    }
}