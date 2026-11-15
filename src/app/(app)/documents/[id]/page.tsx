import { Card, DetailList, PageHeader } from "@/components/ui/display";
import { CaseLink, ClientLink, RefName, UserCell } from "@/features/common";
import { DocumentActions, Preview, VersionsList } from "@/features/documents/document-detail";
import { ActivityList } from "@/features/lists";
import { getDocumentPage } from "@/lib/data/queries";
import { formatDate, formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f-]{36}$/.test(id) ? await supabase.from("documents").select("name").eq("id", id).maybeSingle() : { data: null };
  return { title: data?.name ?? "Документ" };
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const { document, versions, activity } = await getDocumentPage(id);
  const current = versions[0] ?? null;

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
          <Card title="Перегляд" flush>
            <div className="p-2">
              <Preview version={current} />
            </div>
          </Card>
          <Card title={`Версії (${versions.length})`} flush>
            <VersionsList versions={versions} />
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
