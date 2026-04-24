import React, { useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

const WhatsappChatView = ({ context }: { context: any }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const itemId = context?.itemId;

  useEffect(() => {
    if (itemId) {
      console.log(`[FRONTEND - WhatsappChatView] 🔄 Fetching chat history for Item ID: ${itemId}`);
      fetchChatHistory(itemId);
    }
  }, [itemId]);

  const fetchChatHistory = async (id: number) => {
    try {
        // Fetch logic goes here (calling your /api/monday/get_chat_history endpoint)
        console.log("[FRONTEND - WhatsappChatView] ✅ Chat history fetched successfully!");
    } catch (error) {
        console.error("[FRONTEND - WhatsappChatView] ❌ Failed to fetch chat history:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText) return;
    
    console.log(`[FRONTEND - WhatsappChatView] 🚀 Attempting to send message: "${inputText}"`);
    
    try {
        // Your API call to /api/monday/send_item_view_message goes here
        console.log("[FRONTEND - WhatsappChatView] ✅ Message sent successfully from UI!");
        setInputText(""); 
    } catch (error) {
        console.error("[FRONTEND - WhatsappChatView] ❌ Failed to send message:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Your Chat UI HTML goes here */}
      <input 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)} 
        placeholder="Type a message..." 
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default WhatsappChatView;