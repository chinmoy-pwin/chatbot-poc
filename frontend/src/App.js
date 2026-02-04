import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import Dashboard from "@/pages/Dashboard";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Scraping from "@/pages/Scraping";
import ChatTest from "@/pages/ChatTest";
import ApiDocs from "@/pages/ApiDocs";
import Layout from "@/components/Layout";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="scraping" element={<Scraping />} />
            <Route path="chat" element={<ChatTest />} />
            <Route path="api-docs" element={<ApiDocs />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;