// File: src/controllers/invocable-actions.ts

import { Request, Response } from 'express';
import MondayService from '../services/monday-service';
import { WhatsappService } from '../services/whatsapp-service';

export class InvocableActions {
    
    static async getTemplates(req: Request, res: Response) {
        console.log("Inovcalbe Actions get templates ");
        try {
            return res.status(200).send({
                options: [
                    { title: "Transport Invoice (Doc)", value: "transport_invoice" },
                    { title: "Custom Invoice (Text/Doc)", value: "custom_invoice_document" },
                    { title: "Delivery Update (Text)", value: "delivery_update" },
                    { title: "WhatsApp Document (PDF)", value: "whatsapp_document" },
                    { title: "Hello World (Test)", value: "hello_world" }
                ]
            });
        } catch (err) {
            return res.status(500).send({ message: 'Internal error' });
        }
    }

    static async getColumns(req: Request, res: Response) {
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload } = req.body;
        const boardId = payload?.boardId; 

        if (!shortLivedToken || !boardId) return res.status(200).send({ options: [] });

        try {
            const columns = await MondayService.getBoardColumns(shortLivedToken, boardId);
            if (!columns) return res.status(200).send({ options: [] });

            const options = columns.map((col: any) => ({
                title: `${col.title} (${col.type})`,
                value: col.id
            }));

            return res.status(200).send({ options });
        } catch (err) {
            return res.status(500).send({ message: 'Internal error' });
        }
    }

    static async actionSendMessage(req: Request, res: Response) {
        const shortLivedToken = req.session?.shortLivedToken;
        const { payload } = req.body;

        if (!shortLivedToken) return res.status(401).send({ message: 'Unauthorized' });

        const boardId        = payload.inputFields?.boardId   ?? payload.context?.boardId;
        const itemId         = payload.inputFields?.itemId    ?? payload.context?.itemId;
        
        let actualBoardId = boardId; 

        try {
            // Grab the initial UI mappings (these might be Parent columns!)
            let finalResponseColId = payload.inputFields?.responseColumn ?? payload.inboundFieldValues?.responseColumn;
            let finalWamidColId    = payload.inputFields?.wamidColumn ?? payload.inboundFieldValues?.wamidColumn;
            let finalTemplateColId = payload.inputFields?.templateLogColumn ?? payload.inboundFieldValues?.templateLogColumn;
            let finalMessageColId  = payload.inputFields?.messageLogColumn ?? payload.inboundFieldValues?.messageLogColumn;
            
            const documentColumnObj = payload.inputFields?.documentColumn ?? payload.inboundFieldValues?.documentColumn;
            let finalDocumentColId  = documentColumnObj?.value ?? documentColumnObj;
            
            const { templateId, toPhoneColumn } = payload.inboundFieldValues || {};
            const templateName = templateId?.value ?? templateId ?? 'hello_world';
            let finalPhoneColId = toPhoneColumn?.value ?? toPhoneColumn;

            if (!itemId || !finalPhoneColId) return res.status(200).send({});

            const itemData = await MondayService.getSmartItemData(shortLivedToken, itemId);
            if (!itemData) return res.status(200).send({});

            actualBoardId = itemData.board?.id || boardId;
            const isSubitem = String(actualBoardId) !== String(boardId);

            // ==========================================
            // SUBITEM AUTO-TRANSLATOR (The Magic Fix)
            // ==========================================
            if (isSubitem) {
                const parentColumns = await MondayService.getBoardColumns(shortLivedToken, boardId);
                if (parentColumns) {
                    const getSubitemColId = (parentColId: string | undefined) => {
                        if (!parentColId) return undefined;
                        const parentCol = parentColumns.find((c: any) => c.id === parentColId);
                        if (!parentCol) return parentColId; 
                        
                        // Look for a column on the Subitem with the EXACT same title
                        const subCol = itemData.column_values.find((c: any) => c.column?.title?.toLowerCase().trim() === parentCol.title.toLowerCase().trim());
                        return subCol ? subCol.id : parentColId;
                    };

                    finalPhoneColId    = getSubitemColId(finalPhoneColId);
                    finalResponseColId = getSubitemColId(finalResponseColId);
                    finalWamidColId    = getSubitemColId(finalWamidColId);
                    finalTemplateColId = getSubitemColId(finalTemplateColId);
                    finalMessageColId  = getSubitemColId(finalMessageColId);
                    finalDocumentColId = getSubitemColId(finalDocumentColId);
                }
            }

            // --- Continue with normal sending logic ---
            const phoneCol = itemData.column_values.find((c: any) => c.id === finalPhoneColId);
            const rawPhone = phoneCol ? (phoneCol.text || phoneCol.display_value || "") : "";
            let cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(0, 15);

            if (!cleanPhone || cleanPhone.length < 10) {
                if (finalResponseColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, "❌ Error: Invalid Phone");
                return res.status(200).send({});
            }

            let variables: string[] = [];
            let fileUrl: string | undefined = undefined;
            let fileName: string | undefined = undefined; 
            let messageToLog = `[Template Sent: ${templateName}]`; 

            // Document Handler
            if (finalDocumentColId && itemData.column_values) {
                const docCol = itemData.column_values.find((c: any) => c.id === finalDocumentColId);
                if (docCol && docCol.value) {
                    try {
                        const parsedValue = JSON.parse(docCol.value);
                        if (parsedValue && parsedValue.files && parsedValue.files.length > 0) {
                            const targetAssetId = parsedValue.files[0].assetId.toString();
                            const specificAsset = itemData.assets?.find((a: any) => a.id.toString() === targetAssetId);
                            if (specificAsset) {
                                fileUrl = specificAsset.public_url;
                                fileName = specificAsset.name;
                                messageToLog = `[Document Sent: ${fileName}]\n\nTemplate: ${templateName}`;
                            }
                        }
                    } catch (e) { console.error("Could not parse file value"); }
                }
            } 
            
            if (templateName === 'whatsapp_document' && !fileUrl) {
                if (itemData.assets && itemData.assets.length > 0) {
                    fileUrl = itemData.assets[0].public_url;
                    fileName = itemData.assets[0].name;
                } else {
                    const linkedCol = itemData.column_values.find((c: any) => c.linked_items && c.linked_items.length > 0);
                    if (linkedCol && linkedCol.linked_items[0].assets && linkedCol.linked_items[0].assets.length > 0) {
                        fileUrl = linkedCol.linked_items[0].assets[0].public_url;
                        fileName = linkedCol.linked_items[0].assets[0].name;
                    }
                }
                if (fileUrl) messageToLog = `[Document Sent: ${fileName}]\n\nHello! Please find your requested document attached above.`;
            }

            // Variables Handler
            const getColText = (title: string) => {
                const col = itemData.column_values.find((c: any) => c.column?.title?.toLowerCase().trim() === title.toLowerCase().trim());
                if (!col) return "N/A";
                if (col.linked_items && col.linked_items.length > 0) return col.linked_items[0].name || col.display_value || "N/A";
                return col.text || col.display_value || "N/A";
            };

            if (templateName === 'custom_invoice_document') {
                variables = [getColText("Client Name"), getColText("Invoice No"), getColText("Amount"), getColText("Business Unit")];
                const bodyText = `Dear ${variables[0]},\n\nPlease find attached your Brokerage Bill (Invoice No.${variables[1]}) for the total amount of Rs.${variables[2]}.\n\nWe at ${variables[3]} appreciate your business and wish you a great day!`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            } 
            else if (templateName === 'delivery_update') {
                variables = [
                    getColText("Business Units"), getColText("Mill"), getColText("Buyer"), 
                    getColText("Count"), getColText("Bags"), getColText("Total KGS"), 
                    getColText("Sizing Name"), getColText("Date")
                ];
                messageToLog = `Delivery Update from ${variables[0]}\n\nMill: ${variables[1]}\nBuyer: ${variables[2]}\nCount: ${variables[3]}\nQty: ${variables[4]} Bags\nWeight: ${variables[5]} KG\nTo: ${variables[6]}\nDate: ${variables[7]}\n\nThank You.`;
            } 
            else if (templateName === 'hello_world') {
                messageToLog = "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification.";
            }
            // Inside the template mapping section of actionSendMessage in src/controllers/invocable-actions.ts
            else if (templateName === 'transport_invoice') {
                // Helper function to grab text from your columns 
                const getColText = (title: string) => {
                    const col = itemData.column_values.find((c: any) => c.column?.title?.toLowerCase().trim() === title.toLowerCase().trim());
                    if (!col) return "N/A";
                    if (col.display_value) return col.display_value; // Fix for Connect Board/Mirror columns 
                    return col.text || "N/A";
                };

                // Mapping variables based on your Meta Template 
                variables = [
                    getColText("Business Units"),    // {{1}} e.g., Kaarthika Trading Co
                    getColText("To"),    // {{2}} e.g., GreenField Commodities
                    getColText("Total Amount"), // {{3}} e.g., 4000
                    getColText("Date")          // {{4}} e.g., 2025-09-17
                ];

                // Format the log message for Monday.com 
                const bodyText = `The Transport In\n\n${variables[0]} – ${variables[1]} commission bill amt Rs ${variables[2]} for Date ${variables[3]} has been raised and dispatched to your office.\n\nHope to receive payment at earliest.\nAll other details are provided in the attached document.`;
                
                // Include document info in log if a file is sent 
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            }

            const lang = templateName === 'hello_world' ? 'en_US' : 'en';
            
            console.log(`📞 Sending '${templateName}' to phone: ${cleanPhone}`);
            const result = await WhatsappService.sendAdvancedTemplate(cleanPhone, templateName, variables, fileUrl, fileName, lang);

            if (result.messages) {
                if (finalWamidColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalWamidColId, result.messages[0].id);
                if (finalTemplateColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalTemplateColId, templateName);
                if (finalMessageColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalMessageColId, messageToLog);
                if (finalResponseColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, "✅ Sent!");
            } else {
                console.error(`❌ Meta API Failed:`, JSON.stringify(result.error));
                if (finalResponseColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, `❌ ${result.error?.message || "Error"}`);
            }

            return res.status(200).send({});
        } catch (err) {
            console.error("❌ Catch Error in actionSendMessage:", err);
            if (payload.inputFields?.responseColumn && actualBoardId && itemId && shortLivedToken) {
                await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, payload.inputFields.responseColumn, "❌ Server Error");
            }
            return res.status(500).send({ message: 'Error' });
        }
    }
}