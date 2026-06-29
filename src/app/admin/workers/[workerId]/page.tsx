import WorkerDetailClient from "./WorkerDetailClient";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  return <WorkerDetailClient workerId={workerId} />;
}
