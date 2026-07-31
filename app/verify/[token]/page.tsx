"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";

export default function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => { fetch(`/api/certificates/verify?token=${encodeURIComponent(token)}`).then((response) => response.json()).then(setResult).finally(() => setLoading(false)); }, [token]);
  if (loading) return <main className="min-h-screen bg-[#060a17] text-white grid place-items-center">Checking certificate...</main>;
  const valid = result?.valid;
  return <main className="min-h-screen bg-[#060a17] text-white px-4 py-12"><div className="max-w-xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 text-center space-y-5"><div className={`mx-auto h-16 w-16 rounded-full grid place-items-center ${valid ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{valid ? <ShieldCheck className="h-8 w-8" /> : <ShieldX className="h-8 w-8" />}</div><h1 className="text-3xl font-black">{valid ? "Certificate verified" : "Certificate invalid"}</h1>{valid ? <><p className="text-gray-300">This certificate was issued by KIET SIH Team Finder.</p><div className="rounded-2xl bg-black/20 border border-white/10 p-5 text-left space-y-2"><p><span className="text-gray-400">Recipient:</span> {result.member?.name}</p><p><span className="text-gray-400">Team:</span> {result.team?.name}</p><p><span className="text-gray-400">Certificate:</span> {result.certificate?.certificate_number}</p><p><span className="text-gray-400">Issued:</span> {new Date(result.certificate.issued_at).toLocaleDateString("en-IN")}</p>{result.certificate?.award_title && <p><span className="text-gray-400">Achievement:</span> {result.certificate.award_title}</p>}</div></> : <p className="text-gray-400">{result?.error || "This certificate could not be verified."}</p>}<button onClick={() => router.push("/")} className="px-4 py-2 rounded-xl bg-[#f97316] font-semibold">Go to SIH Portal</button></div></main>;
}
