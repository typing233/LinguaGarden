import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { exerciseApi } from '@/api/exercises';
import { wordListApi } from '@/api/wordLists';
import type { WordList } from '@/types';

const EXERCISE_TYPES = [
  { key: 'spelling', icon: '✍️' },
  { key: 'multiple_choice', icon: '🔤' },
  { key: 'card_matching', icon: '🃏' },
];

export default function ExercisePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedType, setSelectedType] = useState('spelling');
  const [selectedList, setSelectedList] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    wordListApi.list().then((r) => setWordLists(r.data));
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data } = await exerciseApi.generate({
        exercise_type: selectedType,
        word_list_id: selectedList || undefined,
        count,
      });
      navigate(`/exercises/${data.id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('exercise.title')}</h1>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('exercise.selectType')}</h2>
          <div className="grid grid-cols-3 gap-4">
            {EXERCISE_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setSelectedType(type.key)}
                className={`p-6 rounded-xl border-2 text-center transition ${
                  selectedType === type.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <div className="font-medium text-sm">{t(`exercise.${type.key === 'multiple_choice' ? 'multipleChoice' : type.key === 'card_matching' ? 'cardMatching' : 'spelling'}`)}</div>
                <div className="text-xs text-gray-500 mt-1">{t(`exercise.${type.key === 'multiple_choice' ? 'multipleChoiceDesc' : type.key === 'card_matching' ? 'cardMatchingDesc' : 'spellingDesc'}`)}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('exercise.selectWordList')}</h2>
          <select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('exercise.allWords')}</option>
            {wordLists.map((list) => (
              <option key={list.id} value={list.id}>{list.name} ({list.word_count})</option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('exercise.wordCount')}: {count}</h2>
          <input
            type="range"
            min={5}
            max={30}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>5</span><span>30</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-lg hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {loading ? t('common.loading') : t('exercise.start')}
        </button>
      </div>
    </div>
  );
}
