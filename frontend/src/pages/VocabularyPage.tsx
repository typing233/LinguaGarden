import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { vocabApi, tagApi } from '@/api/vocabularies';
import type { Vocabulary, Tag } from '@/types';

export default function VocabularyPage() {
  const { t } = useTranslation();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Vocabulary | null>(null);

  const loadWords = async () => {
    const params: Record<string, unknown> = { page, page_size: 20 };
    if (search) params.search = search;
    if (selectedTag) params.tag_id = selectedTag;
    const { data } = await vocabApi.list(params as Parameters<typeof vocabApi.list>[0]);
    setWords(data.items);
    setTotal(data.total);
  };

  useEffect(() => { loadWords(); }, [page, search, selectedTag]);
  useEffect(() => { tagApi.list().then((r) => setTags(r.data)); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    await vocabApi.delete(id);
    toast.success(t('common.success'));
    loadWords();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('vocab.title')}</h1>
        <button onClick={() => { setEditingWord(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
          {t('vocab.addWord')}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder={t('vocab.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <select
          value={selectedTag}
          onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">{t('vocab.tags')}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
      </div>

      {words.length === 0 ? (
        <p className="text-center text-gray-500 py-12">{t('vocab.noWords')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('vocab.word')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('vocab.translation')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('vocab.mastery')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('vocab.tags')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {words.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{word.word}</td>
                  <td className="px-4 py-3 text-gray-600">{word.translation}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${word.mastery_level}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{word.mastery_level}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {word.tags.map((tag) => (
                        <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditingWord(word); setShowForm(true); }} className="text-sm text-primary-600 hover:underline mr-3">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(word.id)} className="text-sm text-red-600 hover:underline">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <span className="px-3 py-1">{page}</span>
          <button onClick={() => setPage(page + 1)} disabled={words.length < 20} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      )}

      {showForm && (
        <VocabFormModal
          word={editingWord}
          tags={tags}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadWords(); }}
        />
      )}
    </div>
  );
}

function VocabFormModal({ word, tags, onClose, onSaved }: { word: Vocabulary | null; tags: Tag[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    word: word?.word || '',
    translation: word?.translation || '',
    definition: word?.definition || '',
    example_sentence: word?.example_sentence || '',
    pronunciation: word?.pronunciation || '',
    difficulty_level: word?.difficulty_level || 1,
    tag_ids: word?.tags.map((t) => t.id) || [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (word) {
      await vocabApi.update(word.id, form);
    } else {
      await vocabApi.create(form);
    }
    toast.success(t('common.success'));
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{word ? t('vocab.editWord') : t('vocab.addWord')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.word')}</label>
            <input type="text" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.translation')}</label>
            <input type="text" value={form.translation} onChange={(e) => setForm({ ...form, translation: e.target.value })} required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.definition')}</label>
            <textarea value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.example')}</label>
            <textarea value={form.example_sentence} onChange={(e) => setForm({ ...form, example_sentence: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.pronunciation')}</label>
            <input type="text" value={form.pronunciation} onChange={(e) => setForm({ ...form, pronunciation: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('vocab.tags')}</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.tag_ids.includes(tag.id)}
                    onChange={(e) => {
                      const ids = e.target.checked ? [...form.tag_ids, tag.id] : form.tag_ids.filter((id) => id !== tag.id);
                      setForm({ ...form, tag_ids: ids });
                    }}
                  />
                  <span className="px-2 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
