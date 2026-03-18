export const sharedClasses = {
  card: "p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700",
  cardTitle: "block font-bold text-xl mb-4",
  button: {
    primary: "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95",
    success: "px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded font-bold text-white transition-colors",
    outline: "px-4 py-2 rounded font-bold transition-colors border",
  },
  input: {
    base: "p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:border-green-500",
    select: "p-2 bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500",
  },
  table: {
    wrapper: "overflow-x-auto",
    root: "min-w-full text-[11px] text-gray-300",
    th: "text-left py-1 pr-2 border-b border-gray-700",
    td: "py-1 pr-2",
    tr: "border-b border-gray-800",
  }
};
