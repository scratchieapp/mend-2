import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft } from "lucide-react";
import { EditDialog } from "@/components/reference-tables/EditDialog";
import { ReferenceTable } from "@/components/reference-tables/ReferenceTable";
import { useReferenceTable } from "@/components/reference-tables/useReferenceTable";
import { tableOptions, TableRowData } from "@/components/reference-tables/types";
import { Link } from "react-router-dom";

export default function ReferenceTablesAdmin() {
  const [activeTable, setActiveTable] = useState(tableOptions[0].name);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<TableRowData | null>(null);

  const currentTable = tableOptions.find(t => t.name === activeTable) || tableOptions[0];
  const {
    data,
    isLoading,
    error,
    addMutation,
    updateMutation,
    deleteMutation
  } = useReferenceTable(currentTable);

  const handleAdd = () => {
    setEditingData(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (row: TableRowData) => {
    setEditingData(row);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = (formData: TableRowData) => {
    if (editingData) {
      updateMutation.mutate({
        id: editingData[currentTable.idColumn],
        data: formData
      });
    } else {
      addMutation.mutate(formData);
    }
    setEditDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold mb-2">Reference Tables</h1>
        <p className="text-muted-foreground">Manage reference data and code tables</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Reference Data Management</CardTitle>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add New Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTable} onValueChange={setActiveTable}>
            <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {tableOptions.map((option) => (
                <TabsTrigger 
                  key={option.name} 
                  value={option.name}
                  className="px-3 py-2 h-auto text-sm whitespace-normal text-center"
                >
                  {option.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {tableOptions.map((option) => (
              <TabsContent 
                key={option.name} 
                value={option.name}
                className="mt-6 space-y-4"
              >
                <ReferenceTable
                  data={data}
                  isLoading={isLoading}
                  error={error}
                  tableOption={currentTable}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <EditDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        data={editingData}
        tableOption={currentTable}
        onSave={handleSave}
      />
    </div>
  );
}