import type { CatchQuizConfig, Question } from './config';
import { overlayStyle } from './styles';

export interface ShownQuestion {
  q: Question;
  /** Thứ tự hiển thị các đáp án (đã xáo). */
  order: number[];
}

/** Thẻ câu hỏi: chọn đáp án, tô đúng/sai sau khi chọn. */
export function QuestionOverlay({
  config: c,
  question,
  picked,
  onAnswer,
}: {
  config: CatchQuizConfig;
  question: ShownQuestion;
  /** Đáp án đã chọn (chỉ số trong question.q.answers); null khi chưa chọn. */
  picked: number | null;
  onAnswer: (answer: number) => void;
}) {
  const overlay = overlayStyle(c.look.overlayTint);
  return (
    <div style={{ ...overlay, zIndex: 70, padding: '28px 24px' }}>
      <div
        style={{
          width: 935,
          height: 1169,
          background: c.quiz.card
            ? `url(${JSON.stringify(c.quiz.card.url)}) center / 100% 100% no-repeat`
            : 'rgba(8,16,38,0.92)',
          borderRadius: c.quiz.card ? 0 : 60,
          border: c.quiz.card ? 'none' : '6px solid #fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20% 18% 11%',
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 60px',
            maxWidth: '100%',
          }}
        >
          {question.q.text}
        </h1>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            overflowY: 'auto',
            padding: '0 7px',
          }}
        >
          {question.order.map((ai, i) => {
            const a = question.q.answers[ai]!;
            const showCorrect = picked !== null && a.correct;
            const showWrong = picked === ai && !a.correct;
            const dim = picked !== null && !showCorrect && !showWrong;
            return (
              <button
                key={ai}
                type="button"
                onClick={() => onAnswer(ai)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 30,
                  width: '100%',
                  minHeight: 103,
                  padding: 0,
                  border:
                    showCorrect || showWrong
                      ? `7px solid ${showWrong ? '#2B2F76' : '#fff'}`
                      : '3px solid #fff',
                  borderRadius: 1000,
                  fontFamily: 'inherit',
                  fontSize: 30,
                  fontWeight: 700,
                  cursor: picked === null ? 'pointer' : 'default',
                  background: showCorrect
                    ? 'linear-gradient(126deg, #1E76BF 14%, #06B4B9 86%)'
                    : showWrong
                      ? '#ABABAB'
                      : '#fff',
                  color: showCorrect || showWrong ? '#fff' : '#2B2F76',
                  marginBottom: 20,
                  textAlign: 'start',
                  opacity: dim ? 0.5 : 1,
                  transition: 'background .2s ease, opacity .2s ease',
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 103,
                    alignSelf: 'stretch',
                    borderRadius: 1000,
                    background: showCorrect
                      ? 'linear-gradient(126deg, #1E76BF 14%, #06B4B9 86%)'
                      : showWrong
                        ? '#ABABAB'
                        : `linear-gradient(126deg, ${c.look.buttonFrom} 14%, ${c.look.buttonTo} 86%)`,
                    color: '#fff',
                    fontSize: 48,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `4px solid ${showWrong ? '#2B2F76' : '#fff'}`,
                    margin: '-3px 0 -3px -3px',
                  }}
                >
                  {showCorrect ? '✓' : showWrong ? '✕' : String.fromCharCode(65 + i)}
                </span>
                <span style={{ padding: '16px 24px 16px 0' }}>{a.text.trim()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
