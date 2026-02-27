import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const AIAssistantWidget = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte a consultar tareas, revisar la contabilidad, o listar clientes. ¿En qué te ayudo hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        const token = localStorage.getItem('token');
        if (!input.trim() || !token) return;

        const userMessage = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    context: location.pathname
                })
            });

            if (!response.ok) throw new Error('Error en la comunicación con la IA');

            const data = await response.json();

            if (data.message && data.message.content) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
            } else if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}`, isError: true }]);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un problema al procesar tu solicitud.', isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px', // Above the theme toggle
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}>
            {/* Chat Box */}
            <div style={{
                display: isOpen ? 'flex' : 'none',
                flexDirection: 'column',
                width: '350px',
                height: '500px',
                maxHeight: '70vh',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: '1px solid var(--card-border)',
                marginBottom: '1rem',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            background: 'var(--primary-color)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Bot size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Asistente IA</h3>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Bprocess Inteligencia</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            gap: '8px',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: 'white'
                            }}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '16px',
                                backgroundColor: msg.role === 'user'
                                    ? 'var(--primary-color)'
                                    : msg.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                color: msg.role === 'user' ? 'white' : (msg.isError ? '#ef4444' : 'inherit'),
                                border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                                fontSize: '0.85rem',
                                lineHeight: '1.4',
                                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                                boxShadow: msg.role === 'user' ? '0 2px 10px rgba(99, 102, 241, 0.2)' : 'none'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={14} />
                            </div>
                            <div style={{ padding: '10px 14px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--card-border)' }}>
                                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--card-border)',
                    background: 'rgba(0,0,0,0.02)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '24px',
                        padding: '4px 8px 4px 16px',
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Escribe tu mensaje..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                background: input.trim() ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                opacity: input.trim() && !isLoading ? 1 : 0.5
                            }}
                        >
                            <Send size={16} style={{ marginLeft: '2px' }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)'
                }}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default AIAssistantWidget;
