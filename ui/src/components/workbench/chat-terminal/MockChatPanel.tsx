import { useState, type ChangeEvent, type KeyboardEvent } from 'react'

/** One chat message item in the mock assistant panel. */
type ChatMessage = {
  /** Sender role in current chat turn. */
  role: 'user' | 'assistant'
  /** Message body text. */
  text: string
}

/**
 * Temporary mock chat panel used as UI placeholder before real LLM integration.
 */
export function MockChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Mock assistant ready. This panel is reserved for LLM integration.' },
  ])
  const [input, setInput] = useState('')

  /** Appends a delayed mock assistant reply for the latest user input. */
  const enqueueMockReply = (text: string) => {
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Mock reply: received "${text}".` },
      ])
    }, 450)
  }

  /** Appends user message and schedules a short mock assistant response. */
  const sendMessage = () => {
    const text = input.trim()
    if (!text) {
      return
    }
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    enqueueMockReply(text)
  }

  /** Updates controlled input state on each text change. */
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value)
  }

  /** Sends message when Enter is pressed in the input box. */
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage()
    }
  }

  /** Renders one chat message row with role and content. */
  const renderMessage = (message: ChatMessage, index: number) => {
    return (
      <div key={`${message.role}-${index}`} className={`chat-msg chat-${message.role}`}>
        <span className="chat-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
        <span>{message.text}</span>
      </div>
    )
  }

  return (
    <div className="panel-shell">
      <div className="panel-title">LLM Chat (Mock)</div>
      <div className="chat-history">
        {messages.map(renderMessage)}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type message..."
          onKeyDown={handleInputKeyDown}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}
