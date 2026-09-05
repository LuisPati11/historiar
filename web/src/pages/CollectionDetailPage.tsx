import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getCollectionMonuments,
  type CollectionMonument,
} from "../lib/api/monuments";
import { getCollectionsProgress, type CollectionProgress } from "../lib/api/achievements";
import { BottomNav } from "../components/BottomNav";

export function CollectionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<CollectionProgress | null>(null);
  const [monuments, setMonuments] = useState<CollectionMonument[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!collectionId) {
      setFailed(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void Promise.all([
      getCollectionsProgress(),
      getCollectionMonuments(collectionId, 100),
    ])
      .then(([progress, collectionMonuments]) => {
        if (cancelled) return;
        setCollection(progress.find((item) => item.collection_id === collectionId) ?? null);
        setMonuments(collectionMonuments);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionId, reloadKey, t]);

  return (
    <main className="min-h-full bg-canvas-white pb-24">
      <header className="px-5 pt-8 pb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="size-10 rounded-full bg-whisper-gray flex items-center justify-center text-xl"
        >
          ‹
        </button>
        <div className="min-w-0">
          <p className="text-body-sm text-ash-gray">{t("collections.collection")}</p>
          <h1 className="text-heading font-bold text-jet-black truncate">
            {collection?.collection_name ?? t("collections.loading")}
          </h1>
        </div>
      </header>

      {loading && (
        <div className="flex justify-center pt-20">
          <div className="size-9 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && failed && (
        <div className="px-6 py-16 text-center">
          <p className="text-subheading font-semibold text-graphite">{t("common.unexpected_error")}</p>
          <p className="mt-2 text-body-sm text-ash-gray">{t("common.connection_error")}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-5 rounded-full bg-pinterest-red px-6 py-3 text-canvas-white font-semibold">
            {t("common.retry")}
          </button>
        </div>
      )}

      {!loading && !failed && !collection && (
        <div className="px-6 py-16 text-center">
          <p className="text-subheading font-semibold text-graphite">{t("collections.not_found")}</p>
          <button type="button" onClick={() => navigate("/collections")} className="mt-5 rounded-full bg-pinterest-red px-6 py-3 text-canvas-white font-semibold">
            {t("collections.back_to_collections")}
          </button>
        </div>
      )}

      {!loading && collection && (
        <div className="px-5 space-y-6">
          <section className="rounded-3xl bg-whisper-gray p-5">
            {collection.collection_description && <p className="text-body text-graphite">{collection.collection_description}</p>}
            <p className="mt-4 text-body font-semibold text-jet-black">
              {t("collections.progress", {
                visited: collection.visited_monuments,
                total: collection.total_monuments,
              })}
            </p>
            <div className="mt-2 h-2 rounded-full bg-canvas-white overflow-hidden">
              <div
                className="h-full rounded-full bg-pinterest-red"
                style={{
                  width: `${collection.total_monuments > 0
                    ? Math.round((collection.visited_monuments / collection.total_monuments) * 100)
                    : 0}%`,
                }}
              />
            </div>
          </section>

          <section>
            <h2 className="text-subheading font-bold text-jet-black mb-3">{t("collections.monuments")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {monuments.map((monument) => (
                <button
                  type="button"
                  key={monument.id}
                  onClick={() => navigate(`/monument/${monument.id}`)}
                  className="overflow-hidden rounded-2xl border border-whisper-gray bg-canvas-white text-left"
                >
                  <div className="aspect-[4/3] bg-whisper-gray">
                    {monument.reference_image_url && (
                      <img src={monument.reference_image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="p-3 text-body font-semibold text-jet-black">{monument.name}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
