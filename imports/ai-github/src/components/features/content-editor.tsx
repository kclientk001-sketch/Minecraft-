"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { editorConfig } from "@/config/admin";
import { Button } from "@/components/ui/button";
type RecordData = Record<string, unknown>;
export function ContentEditor({
  resource,
  initialRecords,
}: {
  resource: string;
  initialRecords: RecordData[];
}) {
  const cfg = editorConfig[resource];
  const [records, setRecords] = useState(initialRecords),
    [editing, setEditing] = useState<RecordData | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  async function reload() {
    const r = await fetch(`/api/admin/${resource}`);
    if (!r.ok) throw Error("Không thể tải lại dữ liệu");
    setRecords(await r.json());
  }
  function edit(record?: RecordData) {
    setError("");
    setEditing(
      record
        ? { ...record }
        : Object.fromEntries(
            cfg.fields.map((f) => [
              f.key,
              f.value ??
                (f.type === "checkbox"
                  ? false
                  : f.type === "number"
                    ? 0
                    : (f.options?.[0] ?? "")),
            ]),
          ),
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        cfg.fields.map((f) => [f.key, editing[f.key] ?? ""]),
      );
      const id = editing.id;
      const res = await fetch(`/api/admin/${resource}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Không thể lưu dữ liệu");
      await reload();
      setEditing(null);
      toast.success("Đã lưu thay đổi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }
  async function remove(record: RecordData) {
    if (
      !window.confirm(
        `Xóa ${String(record.title || record.name || record.label || record.player || record.subject || "bản ghi")}? Thao tác này không thể hoàn tác.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/${resource}/${record.id}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw Error(d.error || "Không thể xóa");
      await reload();
      toast.success("Đã xóa bản ghi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa");
    } finally {
      setBusy(false);
    }
  }
  const filtered = records.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <span className="eyebrow">CONTENT MANAGER</span>
      <div className="admin-title">
        <h1>{cfg.title}</h1>
        {!["settings", "tickets"].includes(resource) && (
          <Button onClick={() => edit()} disabled={busy}>
            <Plus size={17} />
            Thêm mới
          </Button>
        )}
      </div>
      <p className="muted">{cfg.description}</p>
      {error && (
        <p className="notice field-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <form onSubmit={save} className="card editor-form">
          <div className="drawer-heading">
            <h2>{editing.id ? "Chỉnh sửa" : "Tạo mới"}</h2>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Đóng biểu mẫu"
              disabled={busy}
            >
              <X size={20} />
            </Button>
          </div>
          {resource === "tickets" && (
            <div className="ticket-detail">
              <dl>
                {[
                  "type",
                  "player",
                  "email",
                  "subject",
                  "createdAt",
                  "evidenceUrl",
                ].map((key) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(editing[key] || "—")}</dd>
                  </div>
                ))}
              </dl>
              <div className="prose-text">{String(editing.message || "")}</div>
            </div>
          )}
          <div className="editor-fields">
            {cfg.fields.map((f) => (
              <label
                key={f.key}
                className={
                  f.type === "textarea"
                    ? "field-wide"
                    : f.type === "checkbox"
                      ? "checkbox-label"
                      : ""
                }
              >
                {f.type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      checked={!!editing[f.key]}
                      onChange={(e) =>
                        setEditing((v) => ({ ...v, [f.key]: e.target.checked }))
                      }
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    {f.label}
                    {f.type === "select" ? (
                      <select
                        className="input"
                        value={String(editing[f.key] ?? "")}
                        onChange={(e) =>
                          setEditing((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                      >
                        {f.options?.map((o) => (
                          <option value={o} key={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        className="input"
                        rows={f.key === "body" ? 10 : 4}
                        value={String(editing[f.key] ?? "")}
                        onChange={(e) =>
                          setEditing((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <input
                        type={f.type || "text"}
                        className="input"
                        value={String(editing[f.key] ?? "")}
                        onChange={(e) =>
                          setEditing((v) => ({
                            ...v,
                            [f.key]:
                              f.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                      />
                    )}
                  </>
                )}
                {f.help && <small className="muted">{f.help}</small>}
              </label>
            ))}
          </div>
          <div className="editor-actions">
            <Button type="submit" disabled={busy}>
              <Save size={16} />
              {busy ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      <div className="search-form admin-search">
        <Search size={16} />
        <label className="sr-only" htmlFor="admin-search">
          Tìm bản ghi
        </label>
        <input
          id="admin-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm trong danh sách..."
        />
      </div>
      <div className="card admin-records">
        <div className="record-list-head">
          <span>{filtered.length} bản ghi</span>
          <span>THAO TÁC</span>
        </div>
        {filtered.map((record) => (
          <div className="record-row" key={String(record.id)}>
            <div>
              <strong>
                {String(
                  record.title ||
                    record.name ||
                    record.label ||
                    record.player ||
                    record.subject ||
                    record.SERVER_NAME ||
                    record.id,
                )}
              </strong>
              <small>
                {String(
                  record.slug ||
                    record.metric ||
                    record.kind ||
                    record.email ||
                    record.SERVER_IP ||
                    "",
                )}
                {record.isDemo === true ? " · DEMO" : ""}
                {record.published === false || record.enabled === false
                  ? " · Đang tắt"
                  : ""}
                {record.status ? ` · ${record.status}` : ""}
              </small>
            </div>
            <div className="record-actions">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => edit(record)}
              >
                <Pencil size={14} />
                <span>Sửa</span>
              </Button>
              {resource !== "settings" && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => remove(record)}
                  aria-label={`Xóa bản ghi ${String(record.title || record.name || record.player || record.id)}`}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="empty-state">Chưa có bản ghi phù hợp.</div>
        )}
      </div>
    </>
  );
}
