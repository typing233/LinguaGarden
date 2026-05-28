import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { visionApi } from '@/api/vision';
import type { ImageResult } from '@/types';

export default function VisionGardenPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDrop: async (files) => {
      if (files.length === 0) return;
      setLoading(true);
      setResult(null);
      try {
        const { data } = await visionApi.upload(files[0]);
        setResult(data);
        setSelectedIndices([]);
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    },
  });

  const handleAddWords = async () => {
    if (!result || selectedIndices.length === 0) return;
    try {
      await visionApi.addWords(result.id, selectedIndices);
      toast.success(t('garden.addedWords', { count: selectedIndices.length }));
      setSelectedIndices([]);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const loadGallery = async () => {
    const { data } = await visionApi.listImages();
    setImages(data);
    setShowGallery(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('garden.title')}</h1>
        <button onClick={loadGallery} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          {t('garden.gallery')}
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">🌱</div>
        <p className="text-gray-600">{t('garden.uploadDesc')}</p>
      </div>

      {loading && (
        <div className="mt-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">{t('garden.processing')}</p>
        </div>
      )}

      {result && result.processed && (
        <div className="mt-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">{t('garden.description')}</h3>
            <p className="text-gray-700">{result.vision_description}</p>
          </div>

          {result.suggested_words && result.suggested_words.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">{t('garden.suggestedWords')}</h3>
              <div className="space-y-2">
                {result.suggested_words.map((word, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIndices.includes(idx)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIndices([...selectedIndices, idx]);
                        else setSelectedIndices(selectedIndices.filter((i) => i !== idx));
                      }}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{word.word}</span>
                      <span className="mx-2 text-gray-400">—</span>
                      <span className="text-gray-600">{word.translation}</span>
                      {word.definition && <p className="text-sm text-gray-500 mt-0.5">{word.definition}</p>}
                    </div>
                  </label>
                ))}
              </div>
              {selectedIndices.length > 0 && (
                <button
                  onClick={handleAddWords}
                  className="mt-4 w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                >
                  {t('garden.addSelected')} ({selectedIndices.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showGallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGallery(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{t('garden.gallery')}</h2>
            {images.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('garden.noImages')}</p>
            ) : (
              <div className="space-y-4">
                {images.map((img) => (
                  <div key={img.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{img.original_filename}</p>
                        <p className="text-sm text-gray-500 mt-1">{img.vision_description?.slice(0, 100)}...</p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(img.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
