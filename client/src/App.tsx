import React from "react";
import "./App.css";
import "@vibe/core/tokens";
import NewApp from "./components/NewApp";

// This component is for Board View Feature only
// WhatsApp Integration uses backend automation endpoints (sentence builder)
const App = () => {
    return (
        <div className="App">
            <NewApp />
        </div>
    );
};

export default App;
