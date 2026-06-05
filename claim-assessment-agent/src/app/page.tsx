'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertCircle, FileText, Database } from 'lucide-react';

export default function Home() {
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/test-cases')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTestCases(data);
        }
      })
      .catch(console.error);
  }, []);

  const runAssessment = async (id: string) => {
    setLoading(true);
    setRunningId(id);
    setResult(null);
    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId: id })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Error running assessment');
    } finally {
      setLoading(false);
      setRunningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight flex items-center justify-center gap-3">
          <Database className="w-8 h-8" />
          Claim Assessment AI Agent
        </h1>
        <p className="text-slate-500 mt-2 text-lg">AI-powered medical claim review system (PostgreSQL Database)</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Test Cases */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Test Cases
          </h2>
          
          <div className="space-y-4">
            {testCases.length === 0 ? (
              <p className="text-slate-500 italic text-sm">No test cases found in DB. Did you run the seed script?</p>
            ) : (
              testCases.map((tc) => (
                <div key={tc.id} className="border border-slate-100 bg-slate-50 rounded-xl p-4 transition hover:shadow-md">
                  <h3 className="font-semibold text-lg text-slate-800">{tc.id}</h3>
                  <div className="text-xs text-slate-500 mt-1 mb-3">
                    Policy: <span className="font-mono bg-slate-200 px-1 rounded">{tc.policyId}</span>
                  </div>
                  <button 
                    onClick={() => runAssessment(tc.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {runningId === tc.id ? (
                      <span className="animate-pulse">Assessing...</span>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Run Assessment
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Assessment Report */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Assessment Report</h2>
            {result?.error && (
              <div className="text-red-600 p-4 bg-red-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <p>{result.error}</p>
              </div>
            )}
            
            {result?.assessmentReport ? (
              <div className="prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap font-sans text-slate-700">
                  {result.assessmentReport}
                </div>
              </div>
            ) : (
              !loading && !result?.error && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText className="w-12 h-12 mb-2 opacity-50" />
                  <p>Select a test case to view the report</p>
                </div>
              )
            )}
          </div>

          {/* Tool Calls Log */}
          {result?.toolCallLogs && (
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 text-slate-300">
              <h2 className="text-xl font-bold mb-4 text-white border-b border-slate-700 pb-2 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Agent Tool Calls (Trace)
              </h2>
              <div className="space-y-4">
                {result.toolCallLogs.map((log: any, idx: number) => (
                  <div key={idx} className="bg-slate-800 rounded-lg p-4 font-mono text-sm border border-slate-700">
                    <div className="text-emerald-400 font-bold mb-2">Step {log.step}: {log.tool}()</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Input:</div>
                        <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-sky-300">
                          {JSON.stringify(log.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Output:</div>
                        <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-amber-300">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
