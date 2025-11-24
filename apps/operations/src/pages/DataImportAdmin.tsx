
export default function DataImportAdmin() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Data Import
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Import data from external systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImportForm />
            <ImportGuidelines />
          </div>
        </div>
      </div>
    </div>
  );
}