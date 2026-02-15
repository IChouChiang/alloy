import { useState } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

export function MockChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Mock assistant ready. This panel is reserved for LLM integration.' },
  ])
  const [input, setInput] = useState('')

  const sendMessage = () => {
    const text = input.trim()
    if (!text) {
      return
    }
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Mock reply: received "${text}".` },
      ])
    }, 450)
  }

  return (
    <div className="panel-shell">
      <div className="panel-title">LLM Chat (Mock)</div>
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`chat-msg chat-${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type message..."
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              sendMessage()
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}
