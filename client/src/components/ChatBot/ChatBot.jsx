import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  MinusSquare,
  Loader,
  ArrowDown,
  Trash2,
} from "lucide-react";
import styles from "./ChatBot.module.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatRef = useRef(null);
  const [position, setPosition] = useState({
    x: window.innerWidth - 420,
    y: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener("scroll", handleScroll);
      return () =>
        messagesContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Add clear history function
  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("chatHistory");
  };

  if (!isOpen) {
    return (
      <button
        className={styles.chatButton}
        onClick={() => setIsOpen(true)}
        style={{ right: "2rem", bottom: "2rem" }}
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div
      ref={chatRef}
      className={`${styles.chatContainer} ${isMinimized ? styles.minimized : ""}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        visibility: isOpen ? "visible" : "hidden",
      }}
    >
      <div className={styles.chatHeader} onMouseDown={handleMouseDown}>
        <div className={styles.headerTitle}>
          <MessageSquare size={20} />
          <span>Financial Assistant</span>
        </div>
        <div className={styles.headerControls}>
          <button onClick={clearHistory} title="Clear chat history">
            <Trash2 size={18} />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)}>
            <MinusSquare size={18} />
          </button>
          <button onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className={styles.chatMessages} ref={messagesContainerRef}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.message} ${
                  msg.role === "assistant" ? styles.assistant : styles.user
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className={styles.loading}>
                <Loader className={styles.spinner} size={20} />
              </div>
            )}
            <div ref={messagesEndRef} /> {/* Scroll anchor */}
            {showScrollButton && (
              <button
                className={`${styles.scrollButton} ${styles.visible}`}
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
              >
                <ArrowDown size={16} />
              </button>
            )}
          </div>

          <div className={styles.chatInput}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about banking & finance..."
            />
            <button onClick={sendMessage} disabled={isLoading}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;
