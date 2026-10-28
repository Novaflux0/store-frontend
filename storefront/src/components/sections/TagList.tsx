export interface TagListProps {
  readonly tags: readonly string[];
  readonly className?: string;
}

/** Small pill list, labelled for screen readers. */
export function TagList({ tags, className = '' }: TagListProps) {
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
          {tag}
        </li>
      ))}
    </ul>
  );
}
