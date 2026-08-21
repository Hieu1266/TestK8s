"use client";

import { useState, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";

import Navbar from "@/components/Navbar";
import RichTextEditor from "@/components/editors/RichTextEditor";

import {
  ArrowLeft,
  Save,
  Upload,
  FileText,
  Video,
  Settings,
} from "lucide-react";  

export default function LessonPage() {
  const router = useRouter();

  const params = useParams();

  const subjectId = params.subject_id as string;
  const moduleId = params.module_id as string;  
  const lessonId = params.lesson_id as string;

  // ==============================
  // Mock Data
  // ==============================

  const subject = {
    title: "Python Programming",
  };

  const moduleData = {
    title: "Introduction",
  };

  // ==============================
  // Lesson State
  // ==============================

  const [title, setTitle] = useState("Installing Python");

  const [description, setDescription] = useState(
    "Install Python and prepare the development environment.",
  );

  const [duration, setDuration] = useState(20);

  const [order, setOrder] = useState(2);

  const [optional, setOptional] = useState(false);

  const [content, setContent] = useState(`
<h1>Installing Python</h1>

<p>In this lesson you will learn how to install Python.</p>

<h2>Objectives</h2>

<ul>
<li>Install Python</li>
<li>Install VS Code</li>
<li>Verify installation</li>
</ul>
`);

  const [videoUrl, setVideoUrl] = useState("");

  const [status, setStatus] = useState("Published");

  const [preview, setPreview] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState("Public");

  const [resources] = useState([
    {
      id: 1,
      name: "slides.pdf",
    },
    {
      id: 2,
      name: "exercise.zip",
    },
  ]);

  const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files) return;

    setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleSave = () => {
    console.log({
      subjectId,
      moduleId,
      lessonId,
      title,
      description,
      duration,
      order,
      optional,
      content,
      videoUrl,
      status,
      preview,
    });

    alert("Lesson Saved!");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      {/* ================= HEADER ================= */}

      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-100 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Module
          </button>

          <h1 className="text-4xl font-bold mt-5">Lesson Editor</h1>

          <p className="text-blue-100 mt-3">
            {subject.title}

            {" / "}

            {moduleData.title}
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* ================= LESSON INFORMATION ================= */}

        <div className="bg-white rounded-2xl shadow">
          <div className="border-b px-8 py-5 flex items-center gap-3">
            <FileText className="text-[#0066FF]" size={24} />

            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Lesson Information
              </h2>

              <p className="text-slate-500 text-sm">
                Basic information of this lesson.
              </p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Lesson Title */}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Lesson Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter lesson title..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            {/* Duration - Order */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Duration (minutes)
                </label>

                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-[#0066FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lesson Order
                </label>

                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-[#0066FF] outline-none"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optional}
                    onChange={(e) => setOptional(e.target.checked)}
                    className="w-5 h-5"
                  />

                  <span className="font-medium text-slate-700">
                    Optional Lesson
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>

              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this lesson..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 resize-none focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>
          </div>
        </div>
        {/* ================= LESSON CONTENT ================= */}

        <div className="bg-white rounded-2xl shadow">
          <div className="border-b px-8 py-5">
            <h2 className="text-2xl font-bold text-slate-800">
              Lesson Content
            </h2>

            <p className="text-slate-500 mt-1">
              Create the lesson content using the rich text editor. You can add
              headings, images, tables, links and code blocks.
            </p>
          </div>

          <div className="p-8">
            <RichTextEditor value={content} onChange={setContent} />
          </div>
        </div>
        {/* ================= VIDEO & RESOURCES ================= */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ================= VIDEO ================= */}

          <div className="bg-white rounded-2xl shadow">
            <div className="border-b px-8 py-5 flex items-center gap-3">
              <Video className="text-[#0066FF]" />

              <div>
                <h2 className="text-2xl font-bold">Video</h2>

                <p className="text-slate-500 text-sm">
                  Add a YouTube link or upload a video later.
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block font-semibold mb-2">YouTube URL</label>

                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-[#0066FF] outline-none"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Preview</h3>

                <div className="h-56 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  Video Preview
                </div>
              </div>
            </div>
          </div>

          {/* ================= RESOURCES ================= */}

          <div className="bg-white rounded-2xl shadow">
            <div className="border-b px-8 py-5">
              <h2 className="text-2xl font-bold">Resources</h2>

              <p className="text-slate-500 text-sm mt-1">
                Upload PDFs, Slides, ZIP files...
              </p>
            </div>

            <div className="p-8">
              <label
                htmlFor="resource-upload"
                className="border-2 border-dashed rounded-xl h-44 flex flex-col justify-center items-center cursor-pointer hover:border-[#0066FF] transition"
              >
                <Upload size={40} className="text-[#0066FF]" />

                <p className="font-semibold mt-3">Click to Upload</p>

                <p className="text-sm text-slate-500">PDF • PPT • DOCX • ZIP</p>
              </label>

              <input
                id="resource-upload"
                type="file"
                multiple
                hidden
                onChange={handleUploadFiles}
              />

              <div className="mt-8">
                <h3 className="font-semibold mb-4">Uploaded Files</h3>

                {uploadedFiles.length === 0 ? (
                  <p className="text-slate-400">No files uploaded.</p>
                ) : (
                  <div className="space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="border rounded-xl p-4 flex justify-between items-center"
                      >
                        <span>📄 {file.name}</span>

                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() =>
                            setUploadedFiles((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* ================= PUBLISH SETTINGS ================= */}

        <div className="bg-white rounded-2xl shadow">
          <div className="border-b px-8 py-5 flex items-center gap-3">
            <Settings className="text-[#0066FF]" />

            <div>
              <h2 className="text-2xl font-bold">Publish Settings</h2>

              <p className="text-slate-500 text-sm">
                Configure lesson visibility and publishing options.
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Status */}

              <div>
                <label className="block font-semibold mb-3">Status</label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                >
                  <option value="Draft">Draft</option>

                  <option value="Published">Published</option>

                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Visibility */}

              <div>
                <label className="block font-semibold mb-3">Visibility</label>

                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                >
                  <option value="Public">Public</option>

                  <option value="Private">Private</option>
                </select>
              </div>

              {/* Preview */}

              <div>
                <label className="block font-semibold mb-3">Free Preview</label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preview}
                    onChange={(e) => setPreview(e.target.checked)}
                    className="w-5 h-5"
                  />
                  Allow students preview this lesson
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* ================= ACTION BAR ================= */}

        <div className="sticky bottom-4 z-20">
          <div className="bg-white rounded-2xl shadow-lg border px-6 py-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div>
                <p className="font-semibold">Lesson Configuration</p>

                <p className="text-sm text-slate-500">
                  Remember to save before leaving this page.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 border rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button className="px-6 py-3 bg-slate-200 rounded-xl hover:bg-slate-300">
                  Preview
                </button>

                <button
                  onClick={handleSave}
                  className="bg-[#0066FF] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <Save size={18} />
                  Save Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
