export default function Loading() {
  return (
    <div className="container loading-page" aria-label="Đang tải" role="status">
      <div className="skeleton loading-title" />
      <div className="skeleton loading-line" />
      <div className="mode-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton loading-card" />
        ))}
      </div>
      <span className="sr-only">Đang tải nội dung...</span>
    </div>
  );
}
