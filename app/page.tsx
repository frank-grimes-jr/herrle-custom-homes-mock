import { getDashboard } from "@/lib/data";
import { TopNav } from "@/components/TopNav";
import { AttentionPanel } from "@/components/AttentionPanel";
import { FinancialsSection } from "@/components/FinancialsSection";
import { ProjectsSection } from "@/components/ProjectsSection";
import { PipelineSection } from "@/components/PipelineSection";
import { ClientsSection } from "@/components/ClientsSection";
import { TeamSection } from "@/components/TeamSection";
import { SignaturesSection } from "@/components/SignaturesSection";

export default async function Page() {
  const d = await getDashboard();
  const asOf = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(d.asOf));
  const onTrack = d.projects.filter((p) => p.schedule === "on_track").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <TopNav active="overview" />
      <p className="mb-5 text-sm text-muted">Company health · as of {asOf}</p>

      <div className="space-y-5">
        <AttentionPanel items={d.attention} projectsOnTrack={onTrack} projectsTotal={d.projects.length} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <FinancialsSection f={d.financials} />
          </div>
          <div className="lg:col-span-2">
            <ProjectsSection projects={d.projects} />
          </div>
          <PipelineSection p={d.pipeline} />
          <ClientsSection clients={d.clients} />
          <TeamSection team={d.team} />
          <SignaturesSection docs={d.signatures} />
        </div>
      </div>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
        Phase 1 preview · figures are sample data. Live sources (accounting, Google
        Sheets, Docusign, Claude usage) wire in next — the layout stays the same.
      </footer>
    </main>
  );
}
