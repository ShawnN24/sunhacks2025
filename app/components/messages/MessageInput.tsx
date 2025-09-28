"use client";

interface MessageInputProps {
  newMessage: string;
  onNewMessageChange?: (message: string) => void;
  onSendMessage?: () => void;
}

export default function MessageInput({
  newMessage,
  onNewMessageChange,
  onSendMessage
}: MessageInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMessage.trim()) {
      onSendMessage?.();
    }
  };

  return (
    <div className="p-4 bg-white bg-opacity-10">
      <div className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => onNewMessageChange?.(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:bg-opacity-30"
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={() => onSendMessage?.()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          disabled={!newMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}