import React, { useEffect, useState } from 'react';
import {
  fetchProjects,
  fetchTeams,
  importConfluenceArchive,
  preflightConfluenceImport,
} from '../../services/api';
import type {
  ConfluenceMigrationSummary,
  ConfluencePreflightReport,
  Project,
  Team,
} from '../../services/api';

export const ConfluenceImportPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preflight, setPreflight] = useState<ConfluencePreflightReport | null>(null);
  const [importReport, setImportReport] = useState<ConfluenceMigrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams().then((loadedTeams) => {
      setTeams(loadedTeams);
      setTargetTeamId((current) => current || loadedTeams[0]?.id || '');
    }).catch((loadError: Error) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!targetTeamId) {
      setProjects([]);
      return;
    }
    fetchProjects(targetTeamId).then((loadedProjects) => {
      setProjects(loadedProjects);
      setTargetProjectId((current) => loadedProjects.some((project) => project.id === current) ? current : loadedProjects[0]?.id || '');
    }).catch((loadError: Error) => setError(loadError.message));
  }, [targetTeamId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreflight(null);
      setImportReport(null);
      setError(null);
    }
  };

  const handlePreflight = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProgress(25);
    setError(null);
    try {
      const report = await preflightConfluenceImport(selectedFile);
      setPreflight(report);
      setProgress(100);
      setStep(2);
    } catch (preflightError) {
      setError(preflightError instanceof Error ? preflightError.message : 'Could not validate this archive.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunMigration = async () => {
    if (!selectedFile || !targetTeamId || !targetProjectId) return;
    setIsProcessing(true);
    setProgress(20);
    setError(null);
    try {
      const report = await importConfluenceArchive(selectedFile, targetTeamId, targetProjectId);
      setImportReport(report);
      setProgress(100);
      setStep(4);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The migration could not be completed.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPreflightErrors = Boolean(preflight?.issues.some((issue) => issue.level === 'error'));

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-primary)',
      minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>Confluence Space Migration Wizard</h1>
        <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
          Seamlessly import Confluence space backup archives (.zip) into Kollab with complete page tree hierarchies, macros, attachments, and AI search vector indexing.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: '20px', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-card)', backgroundColor: 'var(--panel-color)', color: 'var(--text-primary)' }}>
          {error}
        </div>
      )}

      {/* Stepper Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '16px',
      }}>
        {[
          { num: 1, label: '1. Select Backup File' },
          { num: 2, label: '2. Destination & Users' },
          { num: 3, label: '3. Macro Options' },
          { num: 4, label: '4. Summary Report' },
        ].map((s) => (
          <div
            key={s.num}
            style={{
              fontWeight: step === s.num ? 700 : 400,
              color: step === s.num ? 'var(--primary-color)' : 'var(--text-secondary)',
              borderBottom: step === s.num ? '3px solid var(--primary-color)' : 'none',
              paddingBottom: '8px',
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: Select Backup File */}
      {step === 1 && (
        <div style={{
          backgroundColor: 'var(--panel-color)',
          borderRadius: 'var(--border-radius-card, 12px)',
          border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
          padding: '40px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h2 style={{ fontSize: '22px', margin: '0 0 8px 0' }}>Upload Confluence Space Export Archive (.zip)</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
            Supports exports from both Confluence Cloud (XHTML storage format) and Confluence Data Center / Server (entities.xml).
          </p>

          <label style={{
            backgroundColor: 'var(--primary-color)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 'var(--border-radius-button, 6px)',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-block',
          }}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Browse for .zip Archive'}
            <input type="file" accept=".zip" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <div style={{ marginTop: '32px', textAlign: 'right' }}>
            <button
              onClick={handlePreflight}
              disabled={!selectedFile || isProcessing}
              style={{
                backgroundColor: selectedFile && !isProcessing ? 'var(--secondary-color)' : 'var(--border-color)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: 'var(--border-radius-button, 6px)',
                padding: '10px 24px',
                fontWeight: 600,
                cursor: selectedFile && !isProcessing ? 'pointer' : 'not-allowed',
              }}
            >
              {isProcessing ? 'Checking archive…' : 'Next: Destination Space →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Destination */}
      {step === 2 && (
        <div style={{
          backgroundColor: 'var(--panel-color)',
          borderRadius: 'var(--border-radius-card, 12px)',
          border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
          padding: '32px',
          boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
        }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 16px 0' }}>Select Kollab Destination Space</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Target Team</label>
            <select
              value={targetTeamId}
              onChange={(e) => setTargetTeamId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
            >
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.abbreviation ? ` (${team.abbreviation})` : ''}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Target Project</label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
            >
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.abbreviation ? ` (${project.abbreviation})` : ''}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
              ← Back
            </button>
            <button disabled={!targetTeamId || !targetProjectId || hasPreflightErrors} onClick={() => setStep(3)} style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
              Next: Macro Conversion Options →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Macro Options & Execute */}
      {step === 3 && (
        <div style={{
          backgroundColor: 'var(--panel-color)',
          borderRadius: 'var(--border-radius-card, 12px)',
          border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
          padding: '32px',
          boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
        }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 16px 0' }}>Macro & Attachment Conversion Settings</h2>

          {preflight && (
            <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-card)', backgroundColor: 'var(--bg-color)' }}>
              <strong>{preflight.totalPages} page(s)</strong> and <strong>{preflight.totalAttachments} attachment file(s)</strong> found in the archive.
              {preflight.detectedMacros.length > 0 && <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Macros: {preflight.detectedMacros.map((macro) => `${macro.macro} (${macro.count})${macro.supported ? '' : ' — source preserved'}`).join(', ')}</div>}
              {preflight.issues.length > 0 && <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>{preflight.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Automatically convert Confluence info/note/warning/tip panels to Kollab Callout blocks
            </label>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Generate HNSW AI search vector embeddings for all imported documents via Ollama
            </label>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Transfer all attached files, images, and embedded media into Kollab attachment storage
            </label>
          </div>

          {isProcessing && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Importing space... {progress}%
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} disabled={isProcessing} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
              ← Back
            </button>
            <button
              onClick={handleRunMigration}
              disabled={isProcessing || hasPreflightErrors || !targetTeamId || !targetProjectId}
              style={{
                backgroundColor: 'var(--primary-color)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 24px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isProcessing ? 'Executing Migration...' : '🚀 Start Confluence Migration'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Summary Report */}
      {step === 4 && importReport && (
        <div style={{
          backgroundColor: 'var(--panel-color)',
          borderRadius: 'var(--border-radius-card, 12px)',
          border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
          padding: '32px',
          boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
        }}>
          <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--accent-color)' }}>
            Confluence Migration Completed
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {importReport.successCount} of {importReport.totalPages} detected page(s) were created. Review the audit log below before treating this migration as complete.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{importReport.totalPages}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pages Created</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{importReport.totalAttachments}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Attachments Found</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{importReport.durationMs} ms</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Execution Time</div>
            </div>
          </div>

          {(importReport.warnings.length > 0 || importReport.skippedCount > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Migration Audit & Warnings Log</h3>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {importReport.warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => { setStep(1); setSelectedFile(null); setPreflight(null); setImportReport(null); setError(null); setProgress(0); }}
              style={{
                backgroundColor: 'var(--primary-color)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 24px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Import Another Space
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
