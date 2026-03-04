"use client";

interface PlaceholderPanelProps {
  title: string;
  description: string;
  borderClassName: string;
  titleClassName: string;
}

export default function PlaceholderPanel({
  title,
  description,
  borderClassName,
  titleClassName,
}: PlaceholderPanelProps) {
  return (
    <div className={`mb-8 p-10 rounded-xl border bg-gray-800 shadow-lg ${borderClassName}`}>
      <h2 className={`text-2xl font-bold mb-2 ${titleClassName}`}>{title}</h2>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
