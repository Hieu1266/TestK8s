"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Server,
  Monitor,
  Edit2,
  X,
  Save,
  Loader2,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  Circle,
  Key,
  CheckCircle2,
} from "lucide-react";

// ============================================
// CẤU HÌNH KẾT NỐI TỚI config_service (CHUẨN K8S REWRITES)
// ============================================
const CONFIG_API_BASE =
  process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL || "/api/config-service";

const CONFIG_ADMIN_KEY =
  process.env.NEXT_PUBLIC_CONFIG_ADMIN_KEY || "change-me-please";

const BACKEND_SERVICES = [
  { id: "user_service", label: "user_service" },
  { id: "course_service", label: "course_service" },
  { id: "learning_progress_service", label: "progress_service" },
  { id: "quiz_exam_service", label: "quiz_exam_service" },
] as const;

const FRONTEND_SERVICE_ID = "frontend";

const SECRET_KEY_HINTS = ["SECRET", "PASSWORD", "TOKEN"];
const isSecretField = (key: string) =>
  SECRET_KEY_HINTS.some((hint) => key.toUpperCase().includes(hint));

type ConfigMap = Record<string, string>;
type ViewState = "HOME" | "FRONTEND" | "BACKEND";

// ============================================
// GỌI API CONFIG SERVICE
// ============================================
async function fetchServiceConfig(serviceName: string): Promise<ConfigMap> {
  const res = await fetch(`${CONFIG_API_BASE}/config/${serviceName}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Không lấy được config của "${serviceName}" (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.config as ConfigMap;
}

async function saveServiceConfig(
  serviceName: string,
  config: ConfigMap,
): Promise<ConfigMap> {
  const res = await fetch(`${CONFIG_API_BASE}/config/${serviceName}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": CONFIG_ADMIN_KEY,
    },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Lưu thất bại (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.config as ConfigMap;
}

export default function ConfigPage() {
  const [view, setView] = useState<ViewState>("HOME");
  const [activeBackendTab, setActiveBackendTab] = useState<string>(
    BACKEND_SERVICES[0].id,
  );

  const [configCache, setConfigCache] = useState<Record<string, ConfigMap>>({});
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ConfigMap>({});
  const [isSaving, setIsSaving] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const currentServiceId =
    view === "FRONTEND" ? FRONTEND_SERVICE_ID : activeBackendTab;

  const loadConfig = useCallback(
    async (serviceName: string, force = false) => {
      if (!force && configCache[serviceName]) return;
      setLoadingService(serviceName);
      setErrorMsg(null);
      try {
        const data = await fetchServiceConfig(serviceName);
        setConfigCache((prev) => ({ ...prev, [serviceName]: data }));
      } catch (e: any) {
        setErrorMsg(e.message || "Lỗi không xác định khi tải config.");
      } finally {
        setLoadingService(null);
      }
    },
    [configCache],
  );

  useEffect(() => {
    if (view === "FRONTEND") loadConfig(FRONTEND_SERVICE_ID);
    if (view === "BACKEND") loadConfig(activeBackendTab);
  }, [view, activeBackendTab, loadConfig]);

  const openEditModal = () => {
    setFormData(configCache[currentServiceId] || {});
    setNewKey("");
    setNewValue("");
    setAddFieldError(null);
    setIsEditing(true);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleRemoveField = (key: string) => {
    setFormData((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddField = () => {
    const key = newKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key) {
      setAddFieldError("Tên biến không được để trống.");
      return;
    }
    if (formData.hasOwnProperty(key)) {
      setAddFieldError(`Biến "${key}" đã tồn tại.`);
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: newValue }));
    setNewKey("");
    setNewValue("");
    setAddFieldError(null);
  };

  const handleNewFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddField();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const saved = await saveServiceConfig(currentServiceId, formData);
      setConfigCache((prev) => ({ ...prev, [currentServiceId]: saved }));
      setIsEditing(false);
      setSuccessMsg(
        `Cập nhật thành công! Kubernetes đang kích hoạt Rollout Restart cho pod "${currentServiceId}"...`
      );
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (e: any) {
      setErrorMsg(e.message || "Lưu thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // HOME 
  // ==========================================
  const renderHome = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-8">
      <HomeFileTile
        icon={<Monitor size={24} />}
        filename="frontend-configmap"
        title="Frontend ConfigMap"
        description="Cấu hình biến môi trường Client-side trên Kubernetes."
        previewLines={["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_CONFIG_ADMIN_KEY"]}
        onOpen={() => setView("FRONTEND")}
      />
      <HomeFileTile
        icon={<Server size={24} />}
        filename="k8s-configmaps"
        title="Backend ConfigMaps"
        description="Quản lý Kubernetes ConfigMaps cho 4 Microservices."
        previewLines={["DATABASE_URL", "JWT_SECRET", "PORT"]}
        onOpen={() => setView("BACKEND")}
      />
    </div>
  );

  // ==========================================
  // BẢNG CONFIG
  // ==========================================
  const renderConfigTable = (serviceName: string) => {
    const config = configCache[serviceName];
    const isLoading = loadingService === serviceName;

    if (isLoading && !config) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm font-mono text-slate-400">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span>Đang tải ConfigMap của {serviceName}...</span>
        </div>
      );
    }

    if (!config) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-sm font-mono text-slate-400">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <span>Không thể tải cấu hình</span>
          <button
            onClick={() => loadConfig(serviceName, true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-sans font-medium"
          >
            Thử lại
          </button>
        </div>
      );
    }

    const entries = Object.entries(config);

    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-sm font-mono text-slate-500">
          <Key size={32} className="opacity-20 mb-3" />
          <p>{"// ConfigMap hiện đang trống"}</p>
          <p className="mt-1 opacity-70 font-sans">Nhấn "Chỉnh sửa" để thêm biến mới</p>
        </div>
      );
    }

    return (
      <div className="py-2">
        {entries.map(([key, value], i) => (
          <div
            key={key}
            className="group flex items-start sm:items-center gap-4 px-6 py-3 hover:bg-slate-800/50 transition-colors font-mono text-sm border-b border-slate-800/50 last:border-0"
          >
            <div className="w-8 shrink-0 text-right text-slate-500 select-none text-xs pt-0.5 sm:pt-0">
              {i + 1}
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
              <span className="shrink-0 text-blue-300 font-medium">{key}</span>
              <span className="hidden sm:inline shrink-0 text-slate-600">=</span>
              <span
                className={`min-w-0 flex-1 truncate ${
                  isSecretField(key)
                    ? "text-amber-200/90 tracking-wider"
                    : "text-slate-300"
                }`}
                title={value}
              >
                {isSecretField(key) && value
                  ? "•".repeat(Math.min(value.length, 32))
                  : value || <span className="text-slate-500 italic">""</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ==========================================
  // FRONTEND PANEL
  // ==========================================
  const renderFrontend = () => (
    <EditorPanel
      breadcrumb={["k8s-cluster", "frontend-config"]}
      onBack={() => setView("HOME")}
      onEdit={openEditModal}
      onRefresh={() => loadConfig(FRONTEND_SERVICE_ID, true)}
    >
      {renderConfigTable(FRONTEND_SERVICE_ID)}
    </EditorPanel>
  );

  // ==========================================
  // BACKEND PANEL
  // ==========================================
  const renderBackend = () => (
    <EditorPanel
      breadcrumb={["k8s-cluster", "configmaps", `${activeBackendTab}-config`]}
      onBack={() => setView("HOME")}
      onEdit={openEditModal}
      onRefresh={() => loadConfig(activeBackendTab, true)}
      tabs={
        <div className="flex gap-2 px-4 pt-3 bg-slate-950 overflow-x-auto border-b border-slate-800 scrollbar-hide">
          {BACKEND_SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => setActiveBackendTab(svc.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-mono transition-all duration-200 ${
                activeBackendTab === svc.id
                  ? "bg-slate-900 text-blue-400 border-t-2 border-t-[#0066FF] shadow-[0_-4px_20px_-10px_rgba(0,102,255,0.15)]"
                  : "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 border-t-2 border-t-transparent"
              }`}
            >
              <Circle
                size={8}
                className={
                  activeBackendTab === svc.id
                    ? "fill-blue-400 text-blue-400"
                    : "fill-slate-600 text-slate-600"
                }
              />
              {svc.label}-config
            </button>
          ))}
        </div>
      }
    >
      {renderConfigTable(activeBackendTab)}
    </EditorPanel>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 selection:bg-[#0066FF] selection:text-white">
      <div className="relative z-40">
        <Navbar />
      </div>

      <section className="relative overflow-hidden text-white pt-12 pb-32 px-6 bg-gradient-to-br from-[#0066FF] via-[#0052cc] to-[#003d99]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl animate-pulse"
            style={{ animationDuration: "4s" }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/80 font-medium mb-6">
              <Link
                href="/admin/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
              >
                <ArrowLeft size={14} /> Trang chủ
              </Link>
              <span className="opacity-50">/</span>
              <span className="flex items-center gap-1.5 font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                Cấu hình K8s
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                <Terminal size={24} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                ENVIRONMENT MENU
              </h1>
            </div>
            <p className="max-w-2xl text-[15px] md:text-base text-white/90 font-medium leading-relaxed opacity-90">
              {view === "HOME" &&
                "Chọn dịch vụ bạn muốn cập nhật Kubernetes ConfigMap."}
              {view === "FRONTEND" && "Đang xem ConfigMap của Client-side."}
              {view === "BACKEND" && "Đang xem ConfigMaps của Backend Services."}
            </p>
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 relative z-20 -mt-16">
        {errorMsg && (
          <div className="max-w-5xl mx-auto mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-5 py-4 rounded-xl shadow-sm">
            <AlertTriangle size={18} className="shrink-0 text-red-500" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="max-w-5xl mx-auto mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-5 py-4 rounded-xl shadow-sm animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> {successMsg}
          </div>
        )}
        {view === "HOME" && renderHome()}
        {view === "FRONTEND" && renderFrontend()}
        {view === "BACKEND" && renderBackend()}
      </main>

      {/* ==========================================
          MODAL CHỈNH SỬA
          ========================================== */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isSaving && setIsEditing(false)}
          ></div>

          <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/80 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-base font-mono font-semibold flex items-center gap-3 text-slate-200">
                <span className="flex gap-1.5 opacity-80">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </span>
                <span className="w-px h-4 bg-slate-700 mx-1"></span>
                <Edit2 size={16} className="text-blue-400" />
                {view === "FRONTEND"
                  ? "frontend / configmap"
                  : `k8s / ${activeBackendTab}-config`}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.keys(formData).length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm font-mono text-slate-500">
                    {"// ConfigMap trống. Hãy thêm biến ở bên dưới."}
                  </p>
                </div>
              )}

              {Object.entries(formData).map(([key, value]) => (
                <div key={key} className="group flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="w-full sm:w-[35%] pt-2.5">
                    <label className="block text-xs font-mono font-medium text-blue-300 px-1 truncate">
                      {key}
                    </label>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type={isSecretField(key) ? "password" : "text"}
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                      placeholder="Nhập giá trị..."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveField(key)}
                      title="Xoá biến này"
                      className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-8 pt-2">
                <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-5 transition-colors focus-within:border-blue-500/50 focus-within:bg-slate-950">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
                    <Plus size={16} className="text-blue-400" />
                    Thêm biến môi trường mới vào ConfigMap
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      placeholder="TÊN_BIẾN (KEY)"
                      value={newKey}
                      onChange={(e) => {
                        setNewKey(e.target.value);
                        if (addFieldError) setAddFieldError(null);
                      }}
                      onKeyDown={handleNewFieldKeyDown}
                      className="flex-1 sm:w-1/3 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono uppercase text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    <input
                      placeholder="Giá trị (VALUE)"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={handleNewFieldKeyDown}
                      className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors whitespace-nowrap focus:outline-none"
                    >
                      Thêm
                    </button>
                  </div>
                  {addFieldError && (
                    <p className="text-xs font-medium text-red-400 mt-3 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> {addFieldError}
                    </p>
                  )}
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors focus:outline-none"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-70 focus:outline-none"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? "Đang cập nhật..." : "Lưu & Restart Pod"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT PHỤ TRỢ
// ==========================================

function HomeFileTile({
  icon,
  filename,
  title,
  description,
  previewLines,
  onOpen,
}: {
  icon: React.ReactNode;
  filename: string;
  title: string;
  description: string;
  previewLines: string[];
  onOpen: () => void;
}) {
  return (
    <div
      onDoubleClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group relative bg-white rounded-[24px] border border-slate-200 hover:border-[#0066FF]/40 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0066FF]/20"
    >
      <div className="p-7 flex items-start gap-5">
        <div className="w-14 h-14 shrink-0 bg-blue-50/80 text-[#0066FF] rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#0066FF] group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <div className="min-w-0 pt-1">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mx-7 mb-7 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 border-b border-slate-800/80">
          <div className="flex gap-1.5 opacity-80">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="ml-2 text-xs font-mono text-slate-400">{filename}</span>
        </div>
        <div className="px-5 py-4 space-y-2.5 bg-slate-900">
          {previewLines.map((line) => (
            <div key={line} className="flex items-center gap-3 text-xs font-mono">
              <span className="text-blue-300">{line}</span>
              <span className="text-slate-600">=</span>
              <span className="text-slate-400 tracking-widest">••••••••</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-7 pb-6 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 group-hover:text-[#0066FF] transition-colors flex items-center gap-2">
          Nhấp đúp chuột để cấu hình
        </span>
        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
          <ArrowLeft size={16} className="rotate-180 text-slate-400 group-hover:text-[#0066FF] transition-colors" />
        </div>
      </div>
    </div>
  );
}

function EditorPanel({
  breadcrumb,
  tabs,
  onBack,
  onEdit,
  onRefresh,
  children,
}: {
  breadcrumb: string[];
  tabs?: React.ReactNode;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl shadow-blue-900/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors focus-visible:outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="hidden sm:flex gap-1.5 shrink-0 opacity-80">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <div className="w-px h-5 bg-slate-800 hidden sm:block mx-1"></div>
          <div className="min-w-0 truncate text-sm font-mono text-slate-400 flex items-center gap-2">
            {breadcrumb.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-600">/</span>}
                <span className={i === breadcrumb.length - 1 ? "text-blue-300 font-medium" : ""}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            onClick={onRefresh}
            title="Tải lại config mới nhất"
            className="flex items-center justify-center p-2.5 text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors focus-visible:outline-none"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-xl transition-all shadow-lg shadow-blue-500/25 focus-visible:outline-none"
          >
            <Edit2 size={16} /> Chỉnh sửa
          </button>
        </div>
      </div>

      {tabs}

      <div className="bg-slate-900 min-h-[400px]">
        {children}
      </div>
    </div>
  );
}