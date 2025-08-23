import { MenuBar } from "@/components/MenuBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const SearchVerifyAdmin = () => {
  const [filters, setFilters] = useState({
    active: true,
    archived: false,
    verified: true,
    unverified: true,
    withErrors: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar />
      <div className="container mx-auto p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Search & Verification Tools
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Search across all data and verify information integrity
            </p>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data Types</SelectItem>
                    <SelectItem value="workers">Workers</SelectItem>
                    <SelectItem value="employers">Employers</SelectItem>
                    <SelectItem value="incidents">Incidents</SelectItem>
                    <SelectItem value="claims">Claims</SelectItem>
                    <SelectItem value="medical">Medical Professionals</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    className="pl-10"
                    placeholder="Search by name, ID, or any relevant information..."
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuCheckboxItem
                      checked={filters.active}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, active: checked }))
                      }
                    >
                      Active Records
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.archived}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, archived: checked }))
                      }
                    >
                      Archived Records
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={filters.verified}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, verified: checked }))
                      }
                    >
                      Verified
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.unverified}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, unverified: checked }))
                      }
                    >
                      Unverified
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={filters.withErrors}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({ ...prev, withErrors: checked }))
                      }
                    >
                      With Errors
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Quick Verification Tools</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Verify ABN
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Check Medical Registration
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Validate Address
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Data Integrity Checks</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Find Duplicates
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Validate Required Fields
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Check Relationships
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Bulk Operations</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Bulk Verify
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Export Results
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Schedule Verification
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SearchVerifyAdmin;