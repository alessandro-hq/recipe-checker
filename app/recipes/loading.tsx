import PageWrapper from "@/components/layout/PageWrapper";

export default function Loading() {
  return (
    <PageWrapper className="py-12">
      <div className="mb-10">
        <div className="skeleton h-9 w-48 rounded mb-2" />
        <div className="skeleton h-4 w-24 rounded" />
      </div>
      <div className="skeleton h-8 w-full max-w-lg rounded-full mb-10" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
        {[...Array(12)].map((_, i) => (
          <div key={i}>
            <div className="skeleton rounded-lg w-full" style={{ aspectRatio: "4/3" }} />
            <div className="skeleton mt-3 h-4 w-3/4 rounded" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
