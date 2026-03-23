// File: src/controllers/invocable-actions.ts

import { Request, Response } from 'express';
import MondayService from '../services/monday-service';
import { WhatsappService } from '../services/whatsapp-service';

export class InvocableActions {

    static async getTemplates(req: Request, res: Response) {
        try {
            return res.status(200).send({
                options: [
                    { title: "Dispatch & Billing (Doc)", value: "disptach_and_billing" },
                    { title: "Sales Conf. - BUYER (Doc)", value: "sales_confirmation_buyer" },
                    { title: "Sales Conf. - SUPPLIER (Doc)", value: "sales_confirmation_supplier" },
                    { title: "Commission Invoice (Doc)", value: "commission_invoice" },
                    { title: "Transport Invoice (Doc)", value: "transport_invoice" },
                    { title: "Custom Invoice (Text/Doc)", value: "custom_invoice_document" },
                    { title: "Delivery Update (Text)", value: "delivery_update" },
                    { title: "WhatsApp Document (PDF)", value: "whatsapp_document" },
                    { title: "Lead Document (Text)", value: "lead" },
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

            // ⏱️ MAGIC DELAY: Give Monday time to calculate formulas
            await new Promise(resolve => setTimeout(resolve, 2500));

            const itemData = await MondayService.getSmartItemData(shortLivedToken, itemId);
            if (!itemData) return res.status(200).send({});

            actualBoardId = itemData.board?.id || boardId;
            const isSubitem = String(actualBoardId) !== String(boardId);
            
            let parentItemData: any = null;
            if (isSubitem) {
                const parentRelationCol = itemData.column_values.find((c: any) => c.type === 'board_relation' || c.id === 'parent_item');
                if (parentRelationCol && parentRelationCol.value) {
                    try {
                        const parsed = JSON.parse(parentRelationCol.value);
                        const parentId = parsed?.linkedPulseIds?.[0]?.linkedPulseId;
                        if (parentId) {
                            parentItemData = await MondayService.getSmartItemData(shortLivedToken, parentId);
                        }
                    } catch(e) {}
                }
            }

            if (isSubitem) {
                const parentColumns = await MondayService.getBoardColumns(shortLivedToken, boardId);
                if (parentColumns) {
                    const getSubitemColId = (parentColId: string | undefined) => {
                        if (!parentColId) return undefined;
                        const parentCol = parentColumns.find((c: any) => c.id === parentColId);
                        if (!parentCol) return parentColId; 
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

            // ==========================================
            // UNIVERSAL EXTRACTOR (Partial Match & Formula Fix)
            // ==========================================
            const getColText = (...titles: string[]) => {
                let foundCol: any = null;

                // 1. Exact Match Search
                for (const title of titles) {
                    const cleanTitle = title.toLowerCase().trim();
                    foundCol = itemData.column_values.find((c: any) => c.column?.title?.toLowerCase().trim() === cleanTitle);
                    if (!foundCol && itemData.parent_item?.column_values) {
                        foundCol = itemData.parent_item.column_values.find((c: any) => c.column?.title?.toLowerCase().trim() === cleanTitle);
                    }
                    if (foundCol) break;
                }

                // 2. Partial Match Search
                if (!foundCol) {
                    for (const title of titles) {
                        const cleanTitle = title.toLowerCase().trim();
                        foundCol = itemData.column_values.find((c: any) => c.column?.title?.toLowerCase().includes(cleanTitle));
                        if (!foundCol && itemData.parent_item?.column_values) {
                            foundCol = itemData.parent_item.column_values.find((c: any) => c.column?.title?.toLowerCase().includes(cleanTitle));
                        }
                        if (foundCol) break;
                    }
                }

                // Extract and format the value
                if (foundCol) {
                    const cleanStr = (str: any) => String(str).replace(/['"]+/g, '');

                    if (foundCol.display_value) return cleanStr(foundCol.display_value);
                    if (foundCol.text) return cleanStr(foundCol.text);
                    
                    if (foundCol.value) {
                        try {
                            const parsed = JSON.parse(foundCol.value);
                            if (parsed !== null && typeof parsed === 'object') {
                                if (parsed.result !== undefined && parsed.result !== null) return cleanStr(parsed.result);
                                if (parsed.value !== undefined && parsed.value !== null) return cleanStr(parsed.value);
                            } else if (parsed !== null && parsed !== "") {
                                return cleanStr(parsed);
                            }
                        } catch (e) {
                            return cleanStr(foundCol.value); 
                        }
                    }
                }
                return "N/A";
            };

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
            if (finalDocumentColId) {
                let docCol = itemData.column_values?.find((c: any) => c.id === finalDocumentColId);
                let assetsSource = itemData.assets;

                if (!docCol && itemData.parent_item) {
                    docCol = itemData.parent_item.column_values?.find((c: any) => c.id === finalDocumentColId);
                    assetsSource = itemData.parent_item.assets;
                }

                if (docCol && docCol.value) {
                    try {
                        const parsedValue = JSON.parse(docCol.value);
                        if (parsedValue?.files?.length > 0) {
                            const targetAssetId = parsedValue.files[0].assetId.toString();
                            const specificAsset = assetsSource?.find((a: any) => a.id.toString() === targetAssetId);
                            if (specificAsset) {
                                fileUrl = specificAsset.public_url;
                                fileName = specificAsset.name;
                            }
                        }
                    } catch (e) { console.error("Could not parse file value"); }
                }
            } 

            // ==========================================
            // TEMPLATE MAPPINGS
            // ==========================================
            
            let actualMetaTemplateName = templateName;

            if (templateName === 'disptach_and_billing') {
                variables = [
                    getColText("Buyer Business Unit"), 
                    getColText("Supplier"),      
                    getColText("Buyer"),         
                    getColText("Counts Summary"),
                    isSubitem ? getColText("Quantity Dispatched") : getColText("Quantity"), 
                    getColText("Total Weight"),  
                    getColText("Buyer Office Address"), 
                    getColText("Dispatch Date")  
                ];
                const bodyText = `Greetings from ${variables[0]}.\n\nWe are reaching out to confirm that your shipment has been delivered successfully. The delivery included items from the mill ${variables[1]} for the buyer ${variables[2]}. The specific counts for this order are ${variables[3]}, packed securely in ${variables[4]} bags, with a total delivery weight of ${variables[5]} KG. The entire shipment was delivered safely to the location ${variables[6]} on ${variables[7]}.\n\nThank You for your business!`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            }
            
            else if (templateName === 'sales_confirmation_buyer') {
                actualMetaTemplateName = 'sales_confirmation'; 
                variables = [
                    getColText("Buyer Business Unit"), 
                    getColText("Supplier"),            
                    getColText("Buyer"),               
                    getColText("Summary"),             
                    getColText("Quantity"),            
                    getColText("Bag Weight"),          
                    getColText("Final Rate")           
                ];
                const bodyText = `Greetings from ${variables[0]},\n\nConfirmation has been sent for:\n '${variables[1]} - ${variables[2]} - ${variables[3]} - ${variables[4]}Bags - ${variables[5]}Kg/Bag - ${variables[6]} EX-Mill'\nAll other details are provided in the attached document.`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            }

            else if (templateName === 'sales_confirmation_supplier') {
                actualMetaTemplateName = 'sales_confirmation'; 
                variables = [
                    getColText("Supplier Business Unit"), 
                    getColText("Buyer"),               
                    getColText("Supplier"),                  
                    getColText("Summary"),                
                    getColText("Quantity"),               
                    getColText("Bag Weight"),             
                    getColText("Final Rate")           
                ];
                const bodyText = `Greetings from ${variables[0]},\n\nConfirmation has been sent for:\n '${variables[1]} - ${variables[2]} - ${variables[3]} - ${variables[4]}Bags - ${variables[5]}Kg/Bag - ${variables[6]} EX-Mill'\nAll other details are provided in the attached document.`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            }
            
            else if (templateName === 'commission_invoice') {
                variables = [
                    getColText("Business Units"), 
                    getColText("Buyer Mill/Factory/Delivery Address"),           
                    getColText("Buyer"),          
                    getColText("Net Amount"),         
                    getColText("Invoice From Date"),      
                    getColText("Invoice To Date"),        
                    getColText("Phone"),        
                    getColText("Buyer")    
                ];
                const bodyText = `Thanks for purchasing yarn via ${variables[0]}.\n\n${variables[1]} - ${variables[2]} commission bill amt Rs. ${variables[3]} from Date ${variables[4]} to ${variables[5]} has been raised and dispatched to your office.\n\nHope to receive the payment at earliest contact - ${variables[6]}\nThanks.\nAccount dept\n${variables[7]}\nAll other details are provided in the attached document.`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            }

            else if (templateName === 'transport_invoice') {
                const type       = getColText("Type");
                const rate       = parseFloat(getColText("Rate")) || 0;
                const noOfBags   = parseFloat(getColText("No. Of Bags")) || 0;
                const bagWeight  = parseFloat(getColText("Bag Weight")) || 0;

                const totalWeight = noOfBags * bagWeight;
                const totalAmount = type === "Bag"
                    ? rate * noOfBags
                    : type === "Kg"
                        ? rate * totalWeight
                        : 0;

                variables = [
                    getColText("Business Units"),
                    getColText("To"),
                    String(totalAmount),
                    getColText("Date")
                ];
                const bodyText = `Transport Invoice\n\n${variables[0]} – ${variables[1]} commission bill amt Rs ${variables[2]} for Date ${variables[3]} has been raised and dispatched to your office.\n\nHope to receive payment at earliest.\nAll other details are provided in the attached document.`;
                messageToLog = fileUrl ? `[Document Sent: ${fileName}]\n\n${bodyText}` : bodyText;
            } 
            
            else if (templateName === 'custom_invoice_document') {
                variables = [getColText("Client Name", "Buyer"), getColText("Invoice No"), getColText("Amount"), getColText("Business Unit")];
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
            
            else if (templateName === 'lead') {
                const bodyText = "Hi,\n\nPlease find attached the quotation for the selected counts.\n\nThe document contains a list of suppliers along with their respective prices for your reference. Kindly review the details and let us know your feedback or if you would like to proceed with any option.\n\nFeel free to reach out in case of any queries.\n\nThank you.";
                messageToLog = bodyText;
            } 
            
            else if (templateName === 'hello_world') {
                messageToLog = "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification.";
            }

            // ==========================================
            // 🚨 META API SAFETY CHECKS 🚨
            // ==========================================

            // Safety Check 1: Meta strictly forbids newlines (\n) in body variables (causes 135000 Error).
            // This replaces line breaks in addresses with a comma.
            variables = variables.map(v => String(v).replace(/[\r\n]+/g, ', ').trim());

            // Safety Check 2: disptach_and_billing, delivery_update, and lead do NOT have a Document Header in Meta.
            // If we send a document to them, Meta throws a 135000 Generic User Error.
            if (actualMetaTemplateName === 'disptach_and_billing' || actualMetaTemplateName === 'delivery_update' || actualMetaTemplateName === 'lead') {
                fileUrl = undefined;
                fileName = undefined;
            }

            const lang = actualMetaTemplateName === 'hello_world' ? 'en_US' : 'en';
            
            console.log(`📞 Sending '${actualMetaTemplateName}' to phone: ${cleanPhone}`);
            
            const result = await WhatsappService.sendAdvancedTemplate(cleanPhone, actualMetaTemplateName, variables, fileUrl, fileName, lang);

            if (result.messages) {
                if (finalWamidColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalWamidColId, result.messages[0].id);
                if (finalTemplateColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalTemplateColId, templateName);
                if (finalMessageColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalMessageColId, messageToLog);
                if (finalResponseColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, "✅ Sent!");
            } else {
                if (finalResponseColId) await MondayService.changeColumnValue(shortLivedToken, actualBoardId, itemId, finalResponseColId, `❌ ${result.error?.message || "Error"}`);
            }

            return res.status(200).send({});
        } catch (err) {
            console.error("❌ Catch Error in actionSendMessage:", err);
            return res.status(500).send({ message: 'Error' });
        }
    }
}