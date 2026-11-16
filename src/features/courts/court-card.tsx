import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/display";
import type { Court } from "@/types/domain";

const linkCls = "inline-flex items-center gap-1 text-accent hover:underline";

/** Court contacts on a matter, plus the official services a lawyer opens most often. */
export function CourtCard({ court, courtCaseNumber }: { court: Court; courtCaseNumber?: string }) {
  const firstEmail = court.email.split(/[,;\s]+/).find((e) => e.includes("@"));
  return (
    <Card title="Суд">
      <p className="text-sm font-medium">{court.name}</p>
      <dl className="mt-2 space-y-1.5 text-[13px]">
        {court.address && (
          <div>
            <dt className="text-muted">Адреса</dt>
            <dd>{court.address}</dd>
          </div>
        )}
        {court.phone && (
          <div>
            <dt className="text-muted">Телефон</dt>
            <dd className="num">{court.phone}</dd>
          </div>
        )}
        {firstEmail && (
          <div>
            <dt className="text-muted">Електронна пошта</dt>
            <dd>
              <a href={`mailto:${firstEmail}${courtCaseNumber ? `?subject=${encodeURIComponent(`Справа № ${courtCaseNumber}`)}` : ""}`} className={linkCls}>
                {court.email}
              </a>
            </dd>
          </div>
        )}
        {court.workingHours && (
          <div>
            <dt className="text-muted">Розклад роботи</dt>
            <dd>{court.workingHours}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px]">
        {court.website && (
          <a href={court.website} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Сайт суду <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {court.official && court.code && (
          <a href={`https://court.gov.ua/sud${court.code}/`} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Сторінка на court.gov.ua <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <a href="https://cabinet.court.gov.ua/" target="_blank" rel="noopener noreferrer" className={linkCls}>
          Електронний суд <ExternalLink className="h-3 w-3" />
        </a>
        <a href="https://reyestr.court.gov.ua/" target="_blank" rel="noopener noreferrer" className={linkCls}>
          Реєстр судових рішень <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {court.official && <p className="mt-2 text-xs text-muted">Дані з офіційного переліку судів. Перед поданням документів звіряйте реквізити на сайті суду.</p>}
    </Card>
  );
}
