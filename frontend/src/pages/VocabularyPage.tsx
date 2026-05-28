import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { vocabApi, tagApi } from '@/api/vocabularies';
import { wordListApi } from '@/api/wordLists';
import type { Vocabulary, Tag, WordList } from '@/types';

export default function VocabularyPage() {
  const { t } = useTranslation();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Vocabulary | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [showAddToList, setShowAddToList] = useState<string | null>(null);

  const loadWords = async () => {
    const params: Record<string, unknown> = { page, page_size: 20 };
    if (search) params.search = search;
    if (selectedTag) params.tag_id = selectedTag;
    const { data } = await vocabApi.list(params as Parameters<typeof vocabApi.list>[0]);
    setWords(data.items);
    setTotal(data.total);
  };

  const loadTags = () => tagApi.list().then((r) => setTags(r.data));
  const loadLists = () => wordListApi.list().then((r) => setWordLists(r.data));

  useEffect(() => { loadWords(); }, [page, search, selectedTag]);
  useEffect(() => { loadTags(); loadLists(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    await vocabApi.delete(id);
    toast.success(t('common.success'));
    loadWords();
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar: Word Lists */}
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">{t('vocab.wordLists')}</h3>
            <button onClick={() => setShowListManager(true)} className="text-xs text-primary-600 hover:underline">
              {t('vocab.manageLists')}
            </button>
          </div>
          <div className="space-y-1">
            {wordLists.map((list) => (
              <div key={list.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                <span className="truncate">{list.name}</span>
                <span className="text-xs text-gray-400 ml-2">{list.word_count}</span>
              </div>
            ))}
            {wordLists.length === 0 && <p className="text-xs text-gray-400 px-3">{t('vocab.noLists')}</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">{t('vocab.tags')}</h3>
            <button onClick={() => setShowTagManager(true)} className="text-xs text-primary-600 hover:underline">
              {t('vocab.manageTags')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setSelectedTag(''); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${!selectedTag ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {t('exercise.allWords')}
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { setSelectedTag(selectedTag === tag.id ? '' : tag.id); setPage(1); }}
                className={`px-2.5 py-1 text-xs rounded-full transition ${selectedTag === tag.id ? 'text-white' : 'text-gray-600 border border-gray-200 hover:border-gray-300'}`}
                style={selectedTag === tag.id ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('vocab.title')}</h1>
          <button onClick={() => { setEditingWord(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
            {t('vocab.addWord')}
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder={t('vocab.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
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
                      <div className="flex gap-1 flex-wrap">
                        {word.tags.map((tag) => (
                          <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setShowAddToList(word.id)} className="text-sm text-gray-500 hover:text-primary-600 mr-2" title={t('vocab.addToList')}>+📋</button>
                      <button onClick={() => { setEditingWord(word); setShowForm(true); }} className="text-sm text-primary-600 hover:underline mr-2">{t('common.edit')}</button>
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
      </div>

      {/* Modals */}
      {showForm && (
        <VocabFormModal
          word={editingWord}
          tags={tags}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadWords(); }}
        />
      )}
      {showTagManager && (
        <TagManagerModal
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onChanged={() => { loadTags(); loadWords(); }}
        />
      )}
      {showListManager && (
        <ListManagerModal
          lists={wordLists}
          onClose={() => setShowListManager(false)}
          onChanged={loadLists}
        />
      )}
      {showAddToList && (
        <AddToListModal
          vocabId={showAddToList}
          lists={wordLists}
          onClose={() => setShowAddToList(null)}
          onAdded={loadLists}
        />
      )}
    </div>
  );
}

/* ============ Tag Manager Modal ============ */
function TagManagerModal({ tags, onClose, onChanged }: { tags: Tag[]; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await tagApi.create({ name: name.trim(), color });
      setName('');
      setColor('#6366f1');
      onChanged();
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleUpdate = async () => {
    if (!editingTag || !name.trim()) return;
    try {
      await tagApi.update(editingTag.id, { name: name.trim(), color });
      setEditingTag(null);
      setName('');
      setColor('#6366f1');
      onChanged();
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    await tagApi.delete(id);
    onChanged();
    toast.success(t('common.success'));
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setName('');
    setColor('#6366f1');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{t('vocab.manageTags')}</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('vocab.tagName')}
            className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={(e) => { if (e.key === 'Enter') editingTag ? handleUpdate() : handleCreate(); }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border cursor-pointer"
          />
          {editingTag ? (
            <>
              <button onClick={handleUpdate} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{t('common.save')}</button>
              <button onClick={cancelEdit} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('common.cancel')}</button>
            </>
          ) : (
            <button onClick={handleCreate} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">+</button>
          )}
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm">{tag.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(tag)} className="text-xs text-primary-600 hover:underline">{t('common.edit')}</button>
                <button onClick={() => handleDelete(tag.id)} className="text-xs text-red-600 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
          {tags.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('vocab.noTags')}</p>}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Word List Manager Modal ============ */
function ListManagerModal({ lists, onClose, onChanged }: { lists: WordList[]; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingList, setEditingList] = useState<WordList | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await wordListApi.create({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onChanged();
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleUpdate = async () => {
    if (!editingList || !name.trim()) return;
    try {
      await wordListApi.update(editingList.id, { name: name.trim(), description: description.trim() || undefined });
      setEditingList(null);
      setName('');
      setDescription('');
      onChanged();
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    await wordListApi.delete(id);
    onChanged();
    toast.success(t('common.success'));
  };

  const startEdit = (list: WordList) => {
    setEditingList(list);
    setName(list.name);
    setDescription(list.description || '');
  };

  const cancelEdit = () => {
    setEditingList(null);
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{t('vocab.manageLists')}</h2>

        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('vocab.listName')}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('vocab.listDesc')}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2">
            {editingList ? (
              <>
                <button onClick={handleUpdate} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{t('common.save')}</button>
                <button onClick={cancelEdit} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('common.cancel')}</button>
              </>
            ) : (
              <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{t('vocab.createList')}</button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium">{list.name}</div>
                {list.description && <div className="text-xs text-gray-400">{list.description}</div>}
                <div className="text-xs text-gray-400">{list.word_count} {t('vocab.wordsCount')}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(list)} className="text-xs text-primary-600 hover:underline">{t('common.edit')}</button>
                <button onClick={() => handleDelete(list.id)} className="text-xs text-red-600 hover:underline">{t('common.delete')}</button>
              </div>
            </div>
          ))}
          {lists.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('vocab.noLists')}</p>}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Add to List Modal ============ */
function AddToListModal({ vocabId, lists, onClose, onAdded }: { vocabId: string; lists: WordList[]; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation();

  const handleAdd = async (listId: string) => {
    try {
      await wordListApi.addWords(listId, [vocabId]);
      toast.success(t('common.success'));
      onAdded();
      onClose();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{t('vocab.addToList')}</h2>
        {lists.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t('vocab.noLists')}</p>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleAdd(list.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition"
              >
                <div className="font-medium text-sm">{list.name}</div>
                <div className="text-xs text-gray-400">{list.word_count} {t('vocab.wordsCount')}</div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Vocab Form Modal ============ */
function VocabFormModal({ word, tags, onClose, onSaved }: { word: Vocabulary | null; tags: Tag[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    word: word?.word || '',
    translation: word?.translation || '',
    definition: word?.definition || '',
    example_sentence: word?.example_sentence || '',
    pronunciation: word?.pronunciation || '',
    difficulty_level: word?.difficulty_level || 1,
    tag_ids: word?.tags.map((tg) => tg.id) || [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (word) {
        await vocabApi.update(word.id, form);
      } else {
        await vocabApi.create(form);
      }
      toast.success(t('common.success'));
      onSaved();
    } catch {
      toast.error(t('common.error'));
    }
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
              {tags.map((tg) => (
                <label key={tg.id} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tag_ids.includes(tg.id)}
                    onChange={(e) => {
                      const ids = e.target.checked ? [...form.tag_ids, tg.id] : form.tag_ids.filter((id) => id !== tg.id);
                      setForm({ ...form, tag_ids: ids });
                    }}
                  />
                  <span className="px-2 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: tg.color }}>{tg.name}</span>
                </label>
              ))}
              {tags.length === 0 && <span className="text-xs text-gray-400">{t('vocab.noTags')}</span>}
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
