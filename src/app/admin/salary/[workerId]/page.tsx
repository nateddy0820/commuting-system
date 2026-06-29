import SalaryDetailClient from "./SalaryDetailClient";

export default async function WorkerSalaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { workerId } = await params;
  const { month } = await searchParams;
  return <SalaryDetailClient workerId={workerId} initialMonth={month} />;
}
