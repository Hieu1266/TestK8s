"use client";

interface Props {
  moduleTitle: string;
  subjectTitle: string;
  description: string;
  status: string;
}

export default function ModuleInformation({
  moduleTitle,
  subjectTitle,
  description,
  status,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-8">
      <h2 className="text-xl font-bold text-[#0066FF] mb-6">
        Module Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-slate-500">Module</p>

          <h3 className="font-semibold text-lg">{moduleTitle}</h3>
        </div>

        <div>
          <p className="text-slate-500">Subject</p>

          <h3 className="font-semibold text-lg">{subjectTitle}</h3>
        </div>

        <div>
          <p className="text-slate-500">Status</p>

          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              status === "Published"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="md:col-span-2">
          <p className="text-slate-500">Description</p>

          <p className="mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
