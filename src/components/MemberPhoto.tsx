import { cn } from "@/lib/utils";
import type { DbMember } from "@/db/database";

type MemberPhotoProps = {
  member: Pick<DbMember, "first_name" | "last_name" | "photo" | "updated_at">;
  className?: string;
  imgClassName?: string;
};

export function MemberPhoto({ member, className, imgClassName }: MemberPhotoProps) {
  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}` || "M";
  const src = member.photo && !member.photo.startsWith("data:") && member.updated_at
    ? `${member.photo}${member.photo.includes("?") ? "&" : "?"}v=${encodeURIComponent(member.updated_at)}`
    : member.photo;

  if (src) {
    return (
      <img
        src={src}
        alt={`Photo de ${member.last_name} ${member.first_name}`}
        className={cn("rounded-full object-cover shrink-0 bg-secondary", className, imgClassName)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn("rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0", className)}>
      {initials}
    </div>
  );
}