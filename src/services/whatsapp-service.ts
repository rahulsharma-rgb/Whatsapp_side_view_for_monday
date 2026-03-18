// File: src/services/whatsapp-service.ts

export class WhatsappService {
    private static API_CONFIG = {
        ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
        DEFAULT_PHONE_ID: process.env.WHATSAPP_PHONE_ID
    };

    // 1. Download the secure Monday file and upload it directly to Meta
    static async uploadMedia(fileUrl: string, fileName: string) {
        try {
            console.log(`📥 Downloading file from Monday: ${fileName}...`);
            const fileResponse = await fetch(fileUrl);
            const fileBlob = await fileResponse.blob();

            console.log(`📤 Uploading file directly to Meta...`);
            const formData = new FormData();
            formData.append('messaging_product', 'whatsapp');
            formData.append('file', fileBlob, fileName); 

            const uploadUrl = `https://graph.facebook.com/v18.0/${this.API_CONFIG.DEFAULT_PHONE_ID}/media`;
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.API_CONFIG.ACCESS_TOKEN}` 
                },
                body: formData
            });

            const uploadData = await uploadResponse.json();
            
            if (uploadData.error) {
                console.error("❌ Meta Upload Error:", JSON.stringify(uploadData.error));
                throw new Error("Failed to upload media to Meta");
            }

            console.log(`✅ File accepted by Meta! Media ID: ${uploadData.id}`);
            return uploadData.id;
        } catch (error: any) {
            console.error("❌ Upload Media Catch Error:", error.message);
            throw error;
        }
    }

    // 2. Send the message using the secure Media ID instead of the broken link
    static async sendAdvancedTemplate(toPhone: string, templateName: string, variables: string[], fileUrl?: string, fileName?: string, languageCode: string = 'en') {
        const url = `https://graph.facebook.com/v18.0/${this.API_CONFIG.DEFAULT_PHONE_ID}/messages`;
        const components: any[] = [];
        
        if (fileUrl) {
            const safeFileName = fileName || "Document.pdf";
            
            // Bypass the Amazon block by uploading the file first to get an ID!
            const mediaId = await this.uploadMedia(fileUrl, safeFileName);

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

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.API_CONFIG.ACCESS_TOKEN}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    }
}