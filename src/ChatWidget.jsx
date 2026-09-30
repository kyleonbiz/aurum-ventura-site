import { useState, useRef, useEffect } from "react";

const COLORS = {
  navy: "#041944",
  teal: "#09748B",
  aqua: "#26AEB4",
  ice: "#E6F3F9",
  slate: "#57677F",
  white: "#FFFFFF",
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = assistantMessage;
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: COLORS.aqua,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          transform: isOpen ? "scale(0.95)" : "scale(1)",
        }}
        onMouseEnter={(e) => (e.target.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)")}
        onMouseLeave={(e) => (e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)")}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "100%",
            maxWidth: "400px",
            height: "500px",
            backgroundColor: COLORS.white,
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            zIndex: 998,
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: COLORS.teal,
              color: COLORS.white,
              padding: "16px",
              borderRadius: "12px 12px 0 0",
              fontWeight: "600",
              fontSize: "16px",
            }}
          >
            Aurum Ventura Support
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  color: COLORS.slate,
                  fontSize: "14px",
                  textAlign: "center",
                  marginTop: "20px",
                }}
              >
                Ask me about our services or Aurum Ventura.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor:
                      msg.role === "user" ? COLORS.aqua : COLORS.ice,
                    color:
                      msg.role === "user" ? COLORS.white : COLORS.navy,
                    fontSize: "14px",
                    lineHeight: "1.4",
                    wordWrap: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor: COLORS.ice,
                    color: COLORS.slate,
                    fontSize: "14px",
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            style={{
              display: "flex",
              gap: "8px",
              padding: "12px",
              borderTop: `1px solid ${COLORS.ice}`,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: `1px solid ${COLORS.ice}`,
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 16px",
                backgroundColor: COLORS.aqua,
                color: COLORS.white,
                border: "none",
                borderRadius: "6px",
                cursor: loading || !input.trim() ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
