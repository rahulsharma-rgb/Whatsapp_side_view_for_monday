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
    // 1. Download the secure Monday file and upload it directly to Meta
    static uploadMedia(fileUrl, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📥 Downloading file from Monday: ${fileName}...`);
                const fileResponse = yield fetch(fileUrl);
                const fileBlob = yield fileResponse.blob();
                console.log(`📤 Uploading file directly to Meta...`);
                const formData = new FormData();
                formData.append('messaging_product', 'whatsapp');
                formData.append('file', fileBlob, fileName);
                const uploadUrl = `https://graph.facebook.com/v18.0/${this.API_CONFIG.DEFAULT_PHONE_ID}/media`;
                const uploadResponse = yield fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.API_CONFIG.ACCESS_TOKEN}`
                    },
                    body: formData
                });
                const uploadData = yield uploadResponse.json();
                if (uploadData.error) {
                    console.error("❌ Meta Upload Error:", JSON.stringify(uploadData.error));
                    throw new Error("Failed to upload media to Meta");
                }
                console.log(`✅ File accepted by Meta! Media ID: ${uploadData.id}`);
                return uploadData.id;
            }
            catch (error) {
                console.error("❌ Upload Media Catch Error:", error.message);
                throw error;
            }
        });
    }
    // 2. Send the message using the secure Media ID instead of the broken link
    static sendAdvancedTemplate(toPhone_1, templateName_1, variables_1, fileUrl_1, fileName_1) {
        return __awaiter(this, arguments, void 0, function* (toPhone, templateName, variables, fileUrl, fileName, languageCode = 'en') {
            const url = `https://graph.facebook.com/v18.0/${this.API_CONFIG.DEFAULT_PHONE_ID}/messages`;
            const components = [];
            if (fileUrl) {
                const safeFileName = fileName || "Document.pdf";
                // Bypass the Amazon block by uploading the file first to get an ID!
                const mediaId = yield this.uploadMedia(fileUrl, safeFileName);
                components.push({
                    type: "header",
                    parameters: [{
                            type: "document",
                            document: {
                                id: mediaId, // Use the secure Meta ID here, NOT the link!
                                filename: safeFileName
                            }
                        }]
                });
            }
            if (variables && variables.length > 0) {
                components.push({
                    type: "body",
                    parameters: variables.map(v => ({ type: "text", text: v || "N/A" }))
                });
            }
            const payload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components: components.length > 0 ? components : undefined
                }
            };
            const response = yield fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_CONFIG.ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return yield response.json();
        });
    }
}
exports.WhatsappService = WhatsappService;
WhatsappService.API_CONFIG = {
    ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    DEFAULT_PHONE_ID: process.env.WHATSAPP_PHONE_ID
};
