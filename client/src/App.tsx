import React, { useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";
import WhatsappChatView from "./components/WhatsAppChatView"; // Adjust path if needed
import "./App.css";

const monday = mondaySdk();

const App = () => {
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    console.log("[FRONTEND - App.tsx] 🚀 App initialized, waiting for Monday context...");
    monday.execute("valueCreatedForUser");

    monday.listen("context", (res) => {
      console.log("[FRONTEND - App.tsx] 📦 Monday context received successfully!", res.data);
      setContext(res.data);
    });
  }, []);

  // If there is no context, we are running in a standard web browser!
  if (!context) {
    console.log("[FRONTEND - App.tsx] ⏳ No Monday Context found. Displaying browser fallback message.");
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", color: "#333" }}>
        <h2>✅ ChatView file running smoothly!</h2>
        <p>Add it to your Monday Item View to see the actual widget.</p>
      </div>
    );
  }

  // If context exists, we are inside Monday!
  console.log("[FRONTEND - App.tsx] 🟢 Context verified! Rendering WhatsappChatView.");
  return (
    <div className="App">
      <WhatsappChatView context={context} />
    </div>
  );
};

export default App;