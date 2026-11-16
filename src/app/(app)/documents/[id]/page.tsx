import { Card, DetailList, PageHeader } from "@/components/ui/display";
import { CaseLink, ClientLink, RefName, UserCell } from "@/features/common";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/display";
import { DocumentActions, VersionsList } from "@/features/documents/document-detail";
import { DocumentViewer } from "@/features/documents/viewer";
import { ActivityList } from "@/features/lists";
import { getDocumentPage } from "@/lib/data/queries";
import { formatDate, formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ v?: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f-]{36}$/.test(id) ? await supabase.from("documents").select("name").eq("id", id).maybeSingle() : { data: null };
  return { title: data?.name ?? "Документ" };
}

export default async function DocumentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { v } = (await searchParams) ?? {};
  const { document, versions, activity } = await getDocumentPage(id);
  const current = versions[0] ?? null;
  // Any earlier version can be opened with ?v=<version id>.
  const shown = versions.find((x) => x.id === v) ?? current;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Документи", href: "/documents" }, { label: document.name }]}
        title={document.name}
        meta={
          <>
            <RefName list="documentCategories" id={document.categoryId} />
            {current && <span className="num">версія {current.versionNo}</span>}
          </>
        }
        actions={<DocumentActions document={document} />}
      />

      {document.archivedAt && (
        <p className="mb-4 rounded-md bg-subtle px-3 py-2 text-[13px] text-muted">Документ в архіві з {formatDate(document.archivedAt)}.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={shown && shown !== current ? `Перегляд · версія ${shown.versionNo}` : "Перегляд"} flush>
            <div className="p-2">
              <Suspense key={shown?.id} fallback={<LoadingState label="Готуємо перегляд…" />}>
                <DocumentViewer version={shown} />
              </Suspense>
            </div>
          </Card>
          <Card title={`Версії (${versions.length})`} flush>
            <VersionsList versions={versions} shownId={shown?.id} documentId={document.id} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Відомості">
            <DetailList
              columns={1}
              items={[
                { label: "Клієнт", value: <ClientLink id={document.clientId} /> },
                { label: "Справа", value: <CaseLink id={document.caseId} withNumber /> },
                { label: "Категорія", value: <RefName list="documentCategories" id={document.categoryId} /> },
                { label: "Остання версія", value: current && <span className="num">{formatDateTime(current.uploadedAt)}</span> },
                { label: "Завантажив", value: current && <UserCell id={current.uploadedBy} /> },
                { label: "Опис", value: document.description },
              ]}
            />
          </Card>
          <Card title="Історія" flush>
            <ActivityList rows={activity} />
          </Card>
        </div>
      </div>
    </>
  );
}
