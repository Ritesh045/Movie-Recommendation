import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Film, Sparkles, Bot } from 'lucide-react';
import { sendChatMessage } from '../api';
import '../styles/chatbot.css';

const QUICK_REPLIES = [
  "🏆 Top 10 movies of 2025",
  "🌟 Shah Rukh Khan movies",
  "🔥 Latest & upcoming releases",
  "🍿 Recommend a sci-fi thriller"
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'bot',
    text: "Hi! I'm CineBot 🎬, your CineSphere AI movie assistant. Ask me for recommendations, trending movies, actors, or how to use our site!"
  }
];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.id !== 1)
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        }));

      const res = await sendChatMessage(query, history);
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.reply || "I'm here to help you find great movies! Ask me about recommendations or trending films."
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "I'm just here to help you find something great to watch — ask me about movies, actors, or what's trending!"
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          className="chat-widget-fab"
          onClick={() => setIsOpen(true)}
          title="Ask CineBot AI"
          aria-label="Open AI Movie Assistant Chat"
        >
          <div className="chat-fab-pulse" />
          <Film size={26} />
        </button>
      )}

      {/* Expanded Glassmorphism Chat Panel */}
      {isOpen && (
        <div className="chat-widget-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-title">
              <Film size={22} color="#e50914" />
              <div>
                <span>CineBot AI</span>
                <div className="chat-online-badge">
                  <span className="chat-online-dot" />
                  <span>AI Movie Assistant</span>
                </div>
              </div>
            </div>
            <button
              className="chat-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg-row ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="chat-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-typing-row">
                <div className="chat-avatar">
                  <Bot size={16} />
                </div>
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          <div className="chat-chips-container">
            {QUICK_REPLIES.map((chip, idx) => (
              <button
                key={idx}
                className="chat-chip"
                onClick={() => handleSend(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="chat-input-field"
              placeholder="Ask CineBot about movies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              aria-label="Send Message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
