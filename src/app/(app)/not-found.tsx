import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";

export default function NotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title="Запис не знайдено"
      hint="Можливо, його було переміщено до архіву або посилання застаріло."
      action={<LinkButton href="/">На головну</LinkButton>}
    />
  );
}
