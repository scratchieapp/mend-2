import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Mock data for demonstration
const mockLogs = [
  {
    id: 1,
    timestamp: "2024-03-24 09:15:23",
    level: "INFO",
    component: "Authentication",
    message: "User login successful",
    details: "User ID: 123, IP: 192.168.1.1"
  },
  {
    id: 2,
    timestamp: "2024-03-24 09:14:55",
    level: "WARNING",
    component: "Database",
    message: "Slow query detected",
    details: "Query took 3.5s to execute"
  },
  {
    id: 3,
    timestamp: "2024-03-24 09:13:30",
    level: "ERROR",
    component: "API",
    message: "Request failed",
    details: "Endpoint: /api/data, Status: 500"
  },
  // Add more mock logs as needed
];

const SystemLogsAdmin = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "info":
        return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === "all" || log.level.toLowerCase() === levelFilter.toLowerCase();
    const matchesComponent = componentFilter === "all" || log.component.toLowerCase() === componentFilter.toLowerCase();
    
    return matchesSearch && matchesLevel && matchesComponent;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-bold mb-2">System Logs</h1>
          <p className="text-muted-foreground">Monitor and analyze system activity</p>
        </div>

        <Card className="mb-6">
          <div className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Log Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={componentFilter} onValueChange={setComponentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Components</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setLevelFilter("all");
                  setComponentFilter("all");
                }}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <ScrollArea className="h-[600px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[150px]">Component</TableHead>
                  <TableHead className="w-[250px]">Message</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono">{log.timestamp}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </TableCell>
                    <TableCell>{log.component}</TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell className="font-mono text-sm">{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default SystemLogsAdmin;