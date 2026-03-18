"use strict";
// File: src/services/whatsapp-service.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
class WhatsappService {
    /**
     * Sends a WhatsApp Template message.
     * Supports dynamic sender IDs and dynamic body variables.
     */
    static sendTemplate(toPhone_1, templateName_1) {
        return __awaiter(this, arguments, void 0, function* (toPhone, templateName, languageCode = 'en_US', fromPhone, customMessage) {
            // Use custom sender ID if provided, otherwise fallback to the test DEFAULT_PHONE_ID
            const senderPhoneId = fromPhone ? fromPhone : this.API_CONFIG.DEFAULT_PHONE_ID;
            const url = `https://graph.facebook.com/v18.0/${senderPhoneId}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode }
                }
            };
            // PRODUCTION FEATURE: If a message is provided, inject it as the first variable {{1}}
            if (customMessage) {
                payload.template.components = [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: customMessage }
                        ]
                    }
                ];
            }
            try {
                const response = yield fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.API_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                return yield response.json();
            }
            catch (error) {
                console.error("❌ WhatsApp Service HTTP Error:", error.message);
                throw error;
            }
        });
    }
}
exports.WhatsappService = WhatsappService;
// These load from your Monday App Environment Variables
WhatsappService.API_CONFIG = {
    ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    DEFAULT_PHONE_ID: process.env.WHATSAPP_PHONE_ID
};
