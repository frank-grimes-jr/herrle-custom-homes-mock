import { notFound } from "next/navigation";
import { getProjects } from "@/lib/data";
import { TopNav } from "@/components/TopNav";
import { ProjectDetail } from "@/components/project/ProjectDetail";

// Prerender one page per project for the static export.
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = (await getProjects()).find((p) => p.id === id);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <TopNav active="overview" />
      <ProjectDetail project={project} />
    </main>
  );
}
