import { useState } from 'react';

export interface FeedbackInputProps {
  onSubmit: (feedback: string) => void;
  isLoading: boolean;
}

function FeedbackInput({ onSubmit, isLoading }: FeedbackInputProps) {
  const [feedback, setFeedback] = useState('');
  const isSubmitDisabled = feedback.trim() === '' || isLoading;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitDisabled) return;
    onSubmit(feedback);
    setFeedback('');
  }

  return (
    <form role="search" onSubmit={handleSubmit} aria-busy={isLoading} className="flex w-full gap-2">
      <input
        type="text"
        placeholder='「個室があると良い」「もっとカジュアルな雰囲気が良い」など'
        aria-label="フィードバック入力"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={isLoading}
        className="flex-1 border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '絞り込み中...' : '再レコメンド'}
      </button>
    </form>
  );
}

export default FeedbackInput;
