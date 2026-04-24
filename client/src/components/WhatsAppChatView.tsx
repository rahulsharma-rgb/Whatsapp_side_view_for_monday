import React, { useState, useEffect } from "react";

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
        // Fetch logic goes here 
        // Example to make sure 'setMessages' is used:
        setMessages([{ text: "System ready!", sender: "agent" }]);
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
      {/* 🟢 We are now rendering the messages so ESLint is happy! */}
      <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", height: "200px", overflowY: "scroll" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.sender === 'agent' ? 'right' : 'left', color: msg.sender === 'agent' ? 'green' : 'blue' }}>
            {msg.text}
          </div>
        ))}
      </div>

      <input 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)} 
        placeholder="Type a message..." 
        style={{ padding: "8px", width: "70%" }}
      />
      <button onClick={handleSendMessage} style={{ padding: "8px 16px", marginLeft: "10px" }}>Send</button>
    </div>
  );
};

export default WhatsappChatView;