export class WhatsappService {
    static async sendDirectText(toPhone: string, message: string) {
        console.log(`[BACKEND - WhatsappService] 📞 Formatting text payload for Meta...`);
        
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toPhone,
            type: 'text',
            text: { body: message }
        };

        console.log(`[BACKEND - WhatsappService] 🌐 Firing POST request to Graph API...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("[BACKEND - WhatsappService] ❌ Meta rejected the message:", JSON.stringify(data.error));
        } else {
            console.log("[BACKEND - WhatsappService] ✅ Meta accepted the message successfully!");
        }
        
        return data;
    }
}