import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      {[
        { href: "/extractors/csv",  title: "CSV",          desc: "Sube y analiza archivos CSV"     },
        { href: "/extractors/xlsx", title: "Excel",        desc: "Lee hojas de archivos .xlsx"     },
        { href: "/extractors/db",   title: "Base de datos",desc: "Conéctate a MySQL, PG u Oracle"  },
      ].map((c) => (
        <Link key={c.href} href={c.href}
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-400 hover:shadow-sm transition">
          <h2 className="font-semibold text-gray-800 mb-1">{c.title}</h2>
          <p className="text-sm text-gray-500">{c.desc}</p>
        </Link>
      ))}
    </div>
  );
}